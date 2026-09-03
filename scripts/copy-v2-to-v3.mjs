#!/usr/bin/env node
/**
 * Copy live V2 → V3 (upsert). V2 remains source of truth while admin still types there.
 *
 *   node --env-file=.env.copy scripts/copy-v2-to-v3.mjs          # dry-run
 *   node --env-file=.env.copy scripts/copy-v2-to-v3.mjs --apply
 *
 * Does not copy profiles / Auth. Does not wipe V3-only class_masters, enrollments,
 * session_reports, or availability. Preserves V3 schedules.class_id on upsert.
 */

import { createClient } from '@supabase/supabase-js';
import { KEEP, scrubOrphanIds, transformRow } from './lib/v2-transform.mjs';

const APPLY = process.argv.includes('--apply');
const SKIP_TRACKERS = process.argv.includes('--skip-trackers');
const PAGE = 1000;
const CHUNK = 150;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Copy .env.copy.example → .env.copy and fill V2 + V3 service role keys.`);
    process.exit(1);
  }
  return value;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' }
  });
}

async function fetchAll(sb, table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function upsertChunked(sb, table, rows) {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await sb.from(table).upsert(slice, { onConflict: 'id' });
    if (error) {
      throw new Error(`${table} upsert ${i}-${i + slice.length}: ${error.message}`);
    }
    written += slice.length;
    process.stdout.write(`  ${table} ${written}/${rows.length}\r`);
  }
  if (rows.length) process.stdout.write('\n');
  return written;
}

async function idSet(sb, table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select('id').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} ids: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return new Set(rows.map((row) => String(row.id)));
}

function transformTable(table, rows) {
  const out = [];
  let skipped = 0;
  for (const row of rows) {
    const next = transformRow(table, row);
    if (!next.id) {
      skipped += 1;
      continue;
    }
    if ((table === 'sensei' || table === 'students' || table === 'groups') && !next.name) {
      skipped += 1;
      continue;
    }
    if ((table === 'schedules' || table === 'lesson_trackers') && !next.date) {
      skipped += 1;
      continue;
    }
    out.push(next);
  }
  return { rows: out, skipped };
}

async function main() {
  const v2Url = requiredEnv('V2_SUPABASE_URL');
  const v3Url = requiredEnv('V3_SUPABASE_URL');
  const v2Key = requiredEnv('V2_SUPABASE_SERVICE_ROLE_KEY');
  const v3Key = requiredEnv('V3_SUPABASE_SERVICE_ROLE_KEY');

  if (v2Url.replace(/\/$/, '') === v3Url.replace(/\/$/, '')) {
    console.error('V2_SUPABASE_URL and V3_SUPABASE_URL are the same. Refusing to copy a project onto itself.');
    process.exit(1);
  }

  console.log(`V2  ${hostOf(v2Url)}`);
  console.log(`V3  ${hostOf(v3Url)}`);
  console.log(APPLY ? 'Mode: APPLY (writes to V3)' : 'Mode: dry-run (no writes)');

  const v2 = client(v2Url, v2Key);
  const v3 = client(v3Url, v3Key);

  const senseiV2 = await fetchAll(v2, 'sensei');
  const studentsV2 = await fetchAll(v2, 'students');
  const groupsV2 = await fetchAll(v2, 'groups');
  const schedulesV2 = await fetchAll(v2, 'schedules');
  let trackersV2 = [];
  if (!SKIP_TRACKERS) {
    try {
      trackersV2 = await fetchAll(v2, 'lesson_trackers');
    } catch (error) {
      console.warn(`skip lesson_trackers: ${error instanceof Error ? error.message : error}`);
    }
  }

  const sensei = transformTable('sensei', senseiV2);
  const students = transformTable('students', studentsV2);
  const groups = transformTable('groups', groupsV2);
  const schedules = transformTable('schedules', schedulesV2);
  const trackers = transformTable('lesson_trackers', trackersV2);

  const senseiIds = new Set(sensei.rows.map((row) => row.id));
  const studentIds = new Set(students.rows.map((row) => row.id));
  const groupIds = new Set(groups.rows.map((row) => row.id));
  const scheduleIds = new Set(schedules.rows.map((row) => row.id));

  let scheduleFk = 0;
  schedules.rows = schedules.rows.map((row) => {
    const a = scrubOrphanIds(row, ['sensei_id'], senseiIds);
    const b = scrubOrphanIds(a.row, ['student_id'], studentIds);
    const c = scrubOrphanIds(b.row, ['group_id'], groupIds);
    const d = scrubOrphanIds(c.row, ['makeup_of_session_id'], scheduleIds);
    d.row.student_ids = (d.row.student_ids || []).filter((id) => studentIds.has(id));
    scheduleFk += a.cleared + b.cleared + c.cleared + d.cleared;
    return d.row;
  });

  let trackerFk = 0;
  trackers.rows = trackers.rows.map((row) => {
    const a = scrubOrphanIds(row, ['schedule_id'], scheduleIds);
    const b = scrubOrphanIds(a.row, ['student_id'], studentIds);
    const c = scrubOrphanIds(b.row, ['sensei_id'], senseiIds);
    trackerFk += a.cleared + b.cleared + c.cleared;
    return c.row;
  });

  console.log('\nV2 source → V3 payload');
  console.log(`  sensei           ${senseiV2.length} → ${sensei.rows.length} (skip ${sensei.skipped})`);
  console.log(`  students         ${studentsV2.length} → ${students.rows.length} (skip ${students.skipped})`);
  console.log(`  groups           ${groupsV2.length} → ${groups.rows.length} (skip ${groups.skipped})`);
  console.log(`  schedules        ${schedulesV2.length} → ${schedules.rows.length} (skip ${schedules.skipped}, fk-cleared ${scheduleFk})`);
  console.log(`  lesson_trackers  ${trackersV2.length} → ${trackers.rows.length} (skip ${trackers.skipped}, fk-cleared ${trackerFk})`);

  const v3Before = {
    sensei: (await fetchAll(v3, 'sensei')).length,
    students: (await fetchAll(v3, 'students')).length,
    groups: (await fetchAll(v3, 'groups')).length,
    schedules: (await fetchAll(v3, 'schedules')).length
  };
  console.log('\nV3 now');
  console.log(`  sensei ${v3Before.sensei}  students ${v3Before.students}  groups ${v3Before.groups}  schedules ${v3Before.schedules}`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to upsert into V3.');
    return;
  }

  const v3Schedules = await fetchAll(v3, 'schedules');
  const classIdBySchedule = new Map(
    v3Schedules.filter((row) => row.class_id).map((row) => [String(row.id), String(row.class_id)])
  );
  const v3Sensei = await fetchAll(v3, 'sensei');
  const timezoneBySensei = new Map(
    v3Sensei
      .filter((row) => row.timezone)
      .map((row) => [String(row.id), String(row.timezone)])
  );

  for (const row of sensei.rows) {
    const existingTz = timezoneBySensei.get(row.id);
    const v2Explicit = row.timezone && row.timezone !== 'Asia/Jakarta';
    if (!v2Explicit && existingTz) row.timezone = existingTz;
  }

  for (const row of schedules.rows) {
    const classId = classIdBySchedule.get(row.id);
    if (classId) row.class_id = classId;
  }

  await upsertChunked(v3, 'sensei', sensei.rows);
  await upsertChunked(v3, 'students', students.rows);
  await upsertChunked(v3, 'groups', groups.rows);
  await upsertChunked(v3, 'schedules', schedules.rows.map((row) => pickScheduleForUpsert(row)));

  if (trackers.rows.length) {
    const liveScheduleIds = await idSet(v3, 'schedules');
    const liveStudentIds = await idSet(v3, 'students');
    const liveSenseiIds = await idSet(v3, 'sensei');
    const safeTrackers = trackers.rows.map((row) => {
      const a = scrubOrphanIds(row, ['schedule_id'], liveScheduleIds);
      const b = scrubOrphanIds(a.row, ['student_id'], liveStudentIds);
      const c = scrubOrphanIds(b.row, ['sensei_id'], liveSenseiIds);
      return c.row;
    });
    await upsertChunked(v3, 'lesson_trackers', safeTrackers);
  }

  const v3After = {
    sensei: (await fetchAll(v3, 'sensei')).length,
    students: (await fetchAll(v3, 'students')).length,
    groups: (await fetchAll(v3, 'groups')).length,
    schedules: (await fetchAll(v3, 'schedules')).length
  };
  console.log('\nV3 after');
  console.log(`  sensei ${v3After.sensei}  students ${v3After.students}  groups ${v3After.groups}  schedules ${v3After.schedules}`);
  console.log('Done. Login V3 and check Sensei / Siswa / Jadwal Resmi. Do not delete V2 yet.');
}

function pickScheduleForUpsert(row) {
  const columns = [...KEEP.schedules, 'class_id'];
  const out = {};
  for (const column of columns) {
    if (column in row) out[column] = row[column];
  }
  return out;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
