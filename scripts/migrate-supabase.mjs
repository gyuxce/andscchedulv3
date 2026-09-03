/**
 * V2 -> V3 project-to-project data migration for Supabase (no pg_dump / Pro backup).
 *
 * Reads rows from the OLD (V2) project via REST, reshapes them to the V3 schema
 * (column whitelist + rename + deterministic id remap + FK scrub), and upserts
 * into the NEW project. Uses each project's service_role key (bypasses RLS).
 * Run locally only. scripts/migrate.local.json is gitignored.
 *
 *   node scripts/migrate-supabase.mjs                     # DRY RUN — counts only
 *   node scripts/migrate-supabase.mjs --apply             # migrate (keep rows already in NEW)
 *   node scripts/migrate-supabase.mjs --apply --overwrite # overwrite matching rows in NEW
 *   node scripts/migrate-supabase.mjs --apply --wipe      # DELETE all rows in NEW target tables first, then migrate
 *   node scripts/migrate-supabase.mjs --apply --only sensei,students
 *
 * NOT migrated: profiles (auth), chat/booking/notifications (V4 scope),
 * and V3-only tables with no V2 source (class_masters, enrollments, session_reports, ...).
 * Recreate Sensei logins from the dashboard after migrating.
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./migrate.local.json', import.meta.url), 'utf8'));
const APPLY = process.argv.includes('--apply');
const OVERWRITE = process.argv.includes('--overwrite');
const WIPE = process.argv.includes('--wipe');
const onlyArg = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const ONLY = onlyArg ? new Set(onlyArg.split(',')) : null;

const opts = { auth: { persistSession: false }, db: { schema: 'public' } };
const from = createClient(cfg.from.url, cfg.from.serviceKey, opts);
const to = createClient(cfg.to.url, cfg.to.serviceKey, opts);

// ── id remap (same algorithm as scripts/remap-v2-csv-ids.mjs) ────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function toUuid(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'null') return null;
  if (UUID_RE.test(raw)) return raw.toLowerCase();
  const hash = createHash('sha1').update(`ans-v2-id:${raw}`).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const TIMEZONES = new Set(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']);
const SCHEDULE_STATUS = new Set(['active', 'completed', 'cancelled']);
const ATTENDANCE = new Set(['Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show']);
const ATT_MAP = {
  present: 'Hadir',
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alpa: 'Alpa',
  absent: 'Alpa',
  'no show': 'No Show',
  noshow: 'No Show'
};
const TIME_ADJ = new Set(['None', 'Pending', 'Approved', 'Rejected']);

const tz = (v) => (TIMEZONES.has(v) ? v : 'Asia/Jakarta');
const hhmm = (v) => (v ? String(v).slice(0, 5) : v);
const pick = (row, keys) =>
  Object.fromEntries(keys.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]));

const PAGE = 1000;
async function pull(client, table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (!data || data.length < PAGE) break;
  }
  return rows;
}
async function count(client, table) {
  const { count: c, error } = await client.from(table).select('*', { count: 'exact', head: true });
  return error ? null : c;
}

// ── reference id sets (populated before transforms run) ──────────────────────
const ref = { sensei: new Set(), students: new Set(), groups: new Set(), schedules: new Set() };
const inSet = (set, id) => id != null && set.has(id);
const filterIds = (arr, set) => (Array.isArray(arr) ? arr.map(toUuid).filter((id) => inSet(set, id)) : []);

// ── table plan (FK-safe order) ──────────────────────────────────────────────
const PLAN = [
  {
    name: 'sensei',
    map: (r) => ({
      ...pick(r, [
        'name',
        'note',
        'no_wa',
        'email',
        'level_mengajar',
        'kelas_tersedia',
        'sensei_leave_quota'
      ]),
      id: toUuid(r.id),
      timezone: tz(r.timezone)
    })
  },
  {
    name: 'students',
    map: (r) => {
      const { created_at, ...rest } = r;
      return { ...rest, id: toUuid(r.id) };
    }
  },
  {
    name: 'groups',
    map: (r) => ({
      ...pick(r, ['name', 'description', 'created_at', 'updated_at', 'updated_by']),
      id: toUuid(r.id),
      student_ids: filterIds(r.student_ids, ref.students)
    })
  },
  {
    name: 'schedules',
    map: (r) => {
      const senseiId = toUuid(r.sensei_id);
      if (!inSet(ref.sensei, senseiId)) return null; // NOT NULL FK -> drop orphan
      const groupId = toUuid(r.group_id);
      return {
        ...pick(r, [
          'type',
          'level',
          'date',
          'start_time',
          'end_time',
          'updated_at',
          'updated_by',
          'substitution_status',
          'substitution_requested_at',
          'substitution_requested_by',
          'substitution_assigned_at',
          'substitution_assigned_by',
          'substitution_sensei_name'
        ]),
        id: toUuid(r.id),
        sensei_id: senseiId,
        student_id: inSet(ref.students, toUuid(r.student_id)) ? toUuid(r.student_id) : null,
        student_ids: filterIds(r.student_ids, ref.students),
        group_id: inSet(ref.groups, groupId) ? groupId : null,
        original_sensei_id: r.original_sensei_id ? toUuid(r.original_sensei_id) : null,
        status: SCHEDULE_STATUS.has(String(r.status).toLowerCase())
          ? String(r.status).toLowerCase()
          : 'active'
      };
    }
  },
  {
    name: 'sensei_status',
    source: 'sensei',
    pk: 'sensei_id',
    map: (r) => ({ sensei_id: toUuid(r.id), primary_status: 'ACTIVE' })
  },
  {
    name: 'sensei_availability',
    map: (r) => {
      const senseiId = toUuid(r.sensei_id);
      if (!inSet(ref.sensei, senseiId)) return null;
      return {
        ...pick(r, ['pattern', 'availability_date', 'weekday', 'is_active', 'created_at', 'updated_at']),
        id: toUuid(r.id),
        sensei_id: senseiId,
        start_time: hhmm(r.start_time),
        end_time: hhmm(r.end_time)
      };
    }
  },
  {
    name: 'offdays',
    map: (r) => {
      const senseiId = toUuid(r.sensei_id);
      if (!inSet(ref.sensei, senseiId)) return null;
      return { ...pick(r, ['date', 'reason']), id: toUuid(r.id), sensei_id: senseiId };
    }
  },
  {
    name: 'sensei_time_blocks',
    map: (r) => {
      const senseiId = toUuid(r.sensei_id);
      if (!inSet(ref.sensei, senseiId)) return null;
      return {
        ...pick(r, ['date', 'start_time', 'end_time', 'status', 'note', 'updated_at', 'updated_by']),
        id: toUuid(r.id),
        sensei_id: senseiId
      };
    }
  },
  {
    name: 'session_logs',
    map: (r) => {
      const scheduleId = toUuid(r.schedule_id);
      const senseiId = toUuid(r.sensei_id);
      if (!inSet(ref.schedules, scheduleId) || !inSet(ref.sensei, senseiId)) return null;
      return {
        id: toUuid(r.id),
        schedule_id: scheduleId,
        sensei_id: senseiId,
        clock_in_at: r.check_in_at ?? null,
        clock_out_at: r.check_out_at ?? null,
        late_join: false,
        overridden: Boolean(r.adjustment_status && r.adjustment_status !== 'None')
      };
    }
  },
  {
    name: 'lesson_trackers',
    map: (r) => ({
      ...pick(r, [
        'date',
        'material',
        'score',
        'notes',
        'case_notes',
        'student_feedback',
        'actual_start_time',
        'is_delayed',
        'created_at',
        'curriculum_unit',
        'actual_end_time',
        'time_adjustment_note'
      ]),
      id: String(r.id), // text PK — keep as-is
      schedule_id: inSet(ref.schedules, toUuid(r.schedule_id)) ? toUuid(r.schedule_id) : null,
      student_id: inSet(ref.students, toUuid(r.student_id)) ? toUuid(r.student_id) : null,
      sensei_id: inSet(ref.sensei, toUuid(r.sensei_id)) ? toUuid(r.sensei_id) : null,
      attendance: ATTENDANCE.has(r.attendance)
        ? r.attendance
        : ATT_MAP[String(r.attendance).toLowerCase()] || 'Hadir',
      time_adjustment_status: TIME_ADJ.has(r.time_adjustment_status) ? r.time_adjustment_status : 'None'
    })
  },
  // actor_id in V2 points at auth.users of the OLD project (FK in V3) — drop it;
  // actor_email keeps the "who".
  { name: 'audit_logs', map: (r) => ({ ...r, actor_id: null }) }
];

// Child -> parent order for wiping the NEW project before a clean re-import.
const WIPE_ORDER = [
  'session_student_records',
  'session_reports',
  'teaching_qa_scores',
  'level_completions',
  'enrollments',
  'class_masters',
  'lesson_trackers',
  'session_logs',
  'sensei_availability',
  'sensei_time_blocks',
  'offdays',
  'sensei_status',
  'schedules',
  'groups',
  'students',
  'sensei'
];

async function wipeTarget() {
  console.log('--- WIPE project baru (hapus semua baris di tabel target) ---');
  for (const table of WIPE_ORDER) {
    const before = await count(to, table);
    if (before == null) {
      console.log(`  ${table.padEnd(24)} (tidak ada / dilewati)`);
      continue;
    }
    const { error } = await to.from(table).delete().not('id', 'is', null);
    // tables whose pk is not "id"
    if (error && /column "id" does not exist/i.test(error.message)) {
      const alt = table === 'app_settings' ? 'key' : 'sensei_id';
      await to.from(table).delete().not(alt, 'is', null);
    } else if (error) {
      console.log(`  ${table.padEnd(24)} ERROR: ${error.message}`);
      continue;
    }
    const after = await count(to, table);
    console.log(`  ${table.padEnd(24)} ${before} -> ${after}`);
  }
  console.log('');
}

// ── run ─────────────────────────────────────────────────────────────────────
console.log(
  APPLY
    ? OVERWRITE
      ? '=== APPLY (overwrite) ==='
      : WIPE
        ? '=== APPLY (wipe + import) ==='
        : '=== APPLY (keep existing) ==='
    : '=== DRY RUN (no writes) ==='
);
console.log(`from ${cfg.from.url}\n  to ${cfg.to.url}\n`);

if (APPLY && WIPE) await wipeTarget();

// prime reference id sets
for (const [key, table] of [
  ['sensei', 'sensei'],
  ['students', 'students'],
  ['groups', 'groups'],
  ['schedules', 'schedules']
]) {
  const rows = await pull(from, table).catch(() => []);
  for (const r of rows) ref[key].add(toUuid(r.id));
}

async function pushChunk(table, chunk, pk, dropped) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const payload = dropped.size
      ? chunk.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => !dropped.has(k))))
      : chunk;
    const { error } = await to.from(table).upsert(payload, { onConflict: pk, ignoreDuplicates: !OVERWRITE });
    if (!error) return { ok: true };
    const m =
      /column "([^"]+)" of relation/.exec(error.message) ||
      /Could not find the '([^']+)' column/.exec(error.message) ||
      /column ([a-z0-9_]+) does not exist/i.exec(error.message);
    if (m) {
      dropped.add(m[1]);
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'too many unknown columns' };
}

let grand = 0;
for (const step of PLAN) {
  if (ONLY && !ONLY.has(step.name)) continue;
  const pk = step.pk ?? 'id';
  const src = await pull(from, step.source ?? step.name).catch((e) => {
    console.log(`- ${step.name.padEnd(22)} SKIP (${e.message})`);
    return null;
  });
  if (!src) continue;

  const shaped = src.map(step.map).filter(Boolean);
  const orphans = src.length - shaped.length;
  const before = await count(to, step.name);
  console.log(
    `- ${step.name.padEnd(22)} v2=${String(src.length).padStart(4)}  siap=${String(shaped.length).padStart(4)}` +
      `${orphans ? `  (buang ${orphans} FK yatim)` : ''}  new(before)=${before ?? '?'}`
  );
  if (!APPLY || shaped.length === 0) continue;

  const dropped = new Set();
  let fail = 0;
  for (let i = 0; i < shaped.length; i += PAGE) {
    const res = await pushChunk(step.name, shaped.slice(i, i + PAGE), pk, dropped);
    if (!res.ok) {
      console.log(`    ! ${i}-${i + PAGE}: ${res.error}`);
      fail += 1;
    }
  }
  if (dropped.size) console.log(`    (kolom di-skip: ${[...dropped].join(', ')})`);
  const after = await count(to, step.name);
  if (after != null && before != null) grand += after - before;
  console.log(`    -> new(after)=${after ?? '?'}${fail ? `  (${fail} chunk gagal)` : ''}`);
}

console.log(`\nBaris masuk ke project baru: ${grand}`);
if (!APPLY) console.log('DRY RUN — jalankan lagi + --apply untuk memindahkan sungguhan.');
