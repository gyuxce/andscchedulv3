/**
 * Backfill Class Masters + Enrollments from migrated V2 data.
 *
 * V2 had no class_masters / enrollments — the "class" was flattened onto each
 * student row (session_quota, classroom_link, ...). This reconstructs:
 *   1. one Class Master per class series (grouped from `schedules`)
 *   2. schedules.class_id -> its Class Master
 *   3. one Enrollment per (student, level) in each Class Master
 *
 * Deterministic ids -> safe to re-run. Reads scripts/migrate.local.json ("to").
 *
 *   node scripts/backfill-classes.mjs           # DRY RUN — counts only
 *   node scripts/backfill-classes.mjs --apply   # write
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./migrate.local.json', import.meta.url), 'utf8'));
const APPLY = process.argv.includes('--apply');
const db = createClient(cfg.to.url, cfg.to.serviceKey, { auth: { persistSession: false } });

function uuidFrom(prefix, key) {
  const b = Buffer.from(createHash('sha1').update(`${prefix}:${key}`).digest().subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const CLASS_TYPES = new Set(['Private', 'Semi-Private', 'Group', 'Kids Private', 'Kids Semi Private']);
const PAYMENT = new Set(['LUNAS', 'CICILAN', 'BELUM_BAYAR']);
const mins = (t) => {
  const [h, m] = String(t || '0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const mode = (arr) => {
  const c = {};
  let best = arr[0];
  for (const v of arr) {
    if (v == null) continue;
    c[v] = (c[v] || 0) + 1;
    if (c[v] > (c[best] || 0)) best = v;
  }
  return best;
};

async function pull(table, select) {
  const rows = [];
  for (let o = 0; ; o += 1000) {
    const { data, error } = await db.from(table).select(select).range(o, o + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN ===');
console.log(`to ${cfg.to.url}\n`);

const [students, schedules, reports, trackers, completions, existingEnroll] = await Promise.all([
  pull('students', '*'),
  pull('schedules', 'id,sensei_id,student_ids,type,level,date,start_time,end_time,status,group_id,class_id'),
  pull('session_reports', 'schedule_id'),
  pull('lesson_trackers', 'schedule_id,student_id'),
  pull('level_completions', 'student_id,level'),
  pull('enrollments', 'id,student_id,level,status')
]);

const studentById = new Map(students.map((s) => [s.id, s]));
const reportSchedIds = new Set(reports.map((r) => r.schedule_id));
// V2 academic history lives in lesson_trackers — one per (session, student).
const trackerKeys = new Set(trackers.map((t) => `${t.schedule_id}|${t.student_id}`));
const completedLevel = new Set(completions.map((c) => `${c.student_id}|${c.level}`));
const enrollByKey = new Map(existingEnroll.map((e) => [`${e.student_id}|${e.level}`, e]));

// ---- 1. group schedules into class series ----
const series = new Map(); // key -> { schedules: [], key }
for (const s of schedules) {
  const students_ = Array.isArray(s.student_ids) ? [...s.student_ids].sort() : [];
  const key = s.group_id
    ? `g|${s.group_id}|${s.level}`
    : `p|${s.sensei_id}|${s.level}|${students_.join(',')}`;
  if (!series.has(key)) series.set(key, { key, group_id: s.group_id || null, schedules: [] });
  series.get(key).schedules.push(s);
}

const classMasters = [];
const scheduleClassId = new Map(); // scheduleId -> classMasterId
const enrollments = [];

for (const { key, group_id, schedules: rows } of series.values()) {
  const cmId = uuidFrom('ans-class', key);
  const senseiId = mode(rows.map((r) => r.sensei_id));
  const level = rows[0].level;
  let type = mode(rows.map((r) => r.type));
  const studentIds = [...new Set(rows.flatMap((r) => (Array.isArray(r.student_ids) ? r.student_ids : [])))];
  const members = studentIds.map((id) => studentById.get(id)).filter(Boolean);
  if (!CLASS_TYPES.has(type)) type = members[0]?.type && CLASS_TYPES.has(members[0].type) ? members[0].type : 'Private';

  const quotas = members.map((m) => Number(m.session_quota)).filter((n) => Number.isFinite(n) && n > 0);
  const requiredMeetings = quotas.length ? Math.max(...quotas) : 10;

  const durFromSched = mode(rows.map((r) => mins(r.end_time) - mins(r.start_time)).filter((n) => n > 0));
  const durFromStudent = Number(members.find((m) => Number(m.durasi_kelas) > 0)?.durasi_kelas);
  const sessionDuration = durFromSched || durFromStudent || 90;

  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const linkFrom = members.find((m) => m.classroom_link || m.chat_link || m.curriculum_link) || {};
  const displayName = group_id
    ? `${type} ${level} · ${studentIds.length} siswa`
    : `${members[0]?.name ?? 'Siswa'} · ${level}`;

  classMasters.push({
    id: cmId,
    display_name: displayName,
    type,
    level,
    sensei_id: senseiId,
    student_ids: studentIds,
    required_meetings: requiredMeetings,
    session_duration_minutes: sessionDuration,
    start_date: dates[0] ?? null,
    status: 'active',
    classroom_link: linkFrom.classroom_link || null,
    chat_link: linkFrom.chat_link || null,
    material_link: linkFrom.curriculum_link || null,
    teaching_notes: linkFrom.progress_link ? `Progress: ${linkFrom.progress_link}` : null,
    updated_at: new Date().toISOString(),
    updated_by: 'backfill'
  });

  for (const s of rows) scheduleClassId.set(s.id, cmId);

  for (const studentId of studentIds) {
    const ekey = `${studentId}|${level}`;
    if (enrollByKey.has(ekey)) continue; // keep existing
    const done = rows.filter(
      (r) =>
        r.status !== 'cancelled' &&
        Array.isArray(r.student_ids) &&
        r.student_ids.includes(studentId) &&
        (trackerKeys.has(`${r.id}|${studentId}`) ||
          reportSchedIds.has(r.id) ||
          r.status === 'completed')
    ).length;
    const student = studentById.get(studentId);
    const pay = String(student?.payment_status || '').toUpperCase();
    enrollments.push({
      id: uuidFrom('ans-enroll', ekey),
      student_id: studentId,
      level,
      class_type: type,
      class_id: cmId,
      sensei_id: senseiId,
      status: completedLevel.has(ekey) ? 'completed' : 'active',
      start_date: dates[0] ?? null,
      required_meetings: requiredMeetings,
      sessions_completed: done,
      payment_status: PAYMENT.has(pay) ? pay : null,
      updated_at: new Date().toISOString(),
      updated_by: 'backfill'
    });
  }
}

console.log(`Seri kelas          : ${series.size}`);
console.log(`Class Master dibuat  : ${classMasters.length}`);
console.log(`  - Group/Semi (grup): ${classMasters.filter((c) => /· \d+ siswa/.test(c.display_name)).length}`);
console.log(`  - Private (1:1)     : ${classMasters.filter((c) => !/· \d+ siswa/.test(c.display_name)).length}`);
console.log(`schedules.class_id   : ${scheduleClassId.size} sesi akan ditautkan`);
console.log(`Enrollment baru      : ${enrollments.length} (existing dipertahankan: ${existingEnroll.length})`);
console.log(`  contoh CM: ${JSON.stringify(classMasters[0])}`);
console.log(`  contoh enroll: ${JSON.stringify(enrollments[0])}`);

if (!APPLY) {
  console.log('\nDRY RUN — jalankan lagi + --apply untuk menulis.');
  process.exit(0);
}

// ---- write: class_masters -> schedules.class_id -> enrollments ----
async function upsertAll(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

console.log('\nmenulis class_masters...');
await upsertAll('class_masters', classMasters);

console.log('menautkan schedules.class_id...');
const byCm = new Map();
for (const [sid, cmId] of scheduleClassId) {
  if (!byCm.has(cmId)) byCm.set(cmId, []);
  byCm.get(cmId).push(sid);
}
for (const [cmId, ids] of byCm) {
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await db.from('schedules').update({ class_id: cmId }).in('id', ids.slice(i, i + 200));
    if (error) throw new Error(`schedules: ${error.message}`);
  }
}

console.log('menulis enrollments...');
await upsertAll('enrollments', enrollments);

const [cmCount, enrCount, linked] = await Promise.all([
  db.from('class_masters').select('id', { count: 'exact', head: true }),
  db.from('enrollments').select('id', { count: 'exact', head: true }),
  db.from('schedules').select('id', { count: 'exact', head: true }).not('class_id', 'is', null)
]);
console.log(`\nselesai. class_masters=${cmCount.count} · enrollments=${enrCount.count} · schedules tertaut=${linked.count}`);
