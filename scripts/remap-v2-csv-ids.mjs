#!/usr/bin/env node
/**
 * Remap V2 CSV IDs → UUID valid + whitelist kolom V3.
 *
 * Pakai (PowerShell, dari folder repo):
 *   node scripts\remap-v2-csv-ids.mjs .\backup-ans-v2 .\backup-ans-v2-ready
 *
 * Lalu impor *.ready.csv ke V3:
 *   sensei → students → groups → schedules → lesson_trackers → audit_logs
 * Skip profiles.
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toUuid } from './lib/v2-ids.mjs';

const inputDir = path.resolve(process.argv[2] || './backup-ans-v2');
const outputDir = path.resolve(process.argv[3] || './backup-ans-v2-ready');

const ID_COLUMNS = new Set([
  'id',
  'sensei_id',
  'student_id',
  'group_id',
  'schedule_id',
  'class_id',
  'makeup_of_session_id',
  'session_report_id'
]);

const ID_ARRAY_COLUMNS = new Set(['student_ids']);

/** Hanya kolom yang ada di schema V3 — kolom ekstra V2 dibuang */
const KEEP_BY_FILE = {
  sensei_rows: [
    'id',
    'name',
    'display_name',
    'note',
    'no_wa',
    'email',
    'level_mengajar',
    'kelas_tersedia',
    'sensei_leave_quota',
    'timezone'
  ],
  students_rows: [
    'id',
    'name',
    'phone',
    'level',
    'type',
    'sensei_name',
    'level_awal',
    'level_sekarang',
    'durasi_kelas',
    'session_quota',
    'student_leave_quota',
    'payment_status',
    'is_active',
    'inactive_reason',
    'special_note',
    'exam_note',
    'admin_note',
    'curriculum_level',
    'curriculum_unit',
    'curriculum_progress',
    'graduate_level',
    'classroom_link',
    'chat_link',
    'progress_link',
    'curriculum_link',
    'email'
  ],
  groups_rows: ['id', 'name', 'description', 'student_ids', 'created_at', 'updated_at', 'updated_by'],
  schedules_rows: [
    'id',
    'sensei_id',
    'student_id',
    'student_ids',
    'group_id',
    'type',
    'level',
    'date',
    'start_time',
    'end_time',
    'status',
    'updated_at',
    'updated_by',
    'original_sensei_id',
    'substitution_status',
    'substitution_requested_at',
    'substitution_requested_by',
    'substitution_assigned_at',
    'substitution_assigned_by',
    'substitution_sensei_name',
    'makeup_of_session_id',
    'is_extra',
    'cancellation_reason',
    'cancellation_initiator',
    'replacement_secured',
    'swap_initiator',
    'swap_reason'
  ],
  lesson_trackers_rows: [
    'id',
    'schedule_id',
    'student_id',
    'sensei_id',
    'date',
    'attendance',
    'curriculum_unit',
    'material',
    'score',
    'notes',
    'case_notes',
    'student_feedback',
    'actual_start_time',
    'actual_end_time',
    'time_adjustment_note',
    'time_adjustment_status',
    'is_delayed',
    'created_at'
  ],
  audit_logs_rows: ['id', 'actor_email', 'action', 'collection_name', 'record_id', 'payload', 'created_at'],
  profiles_rows: null
};

const SCHEDULE_STATUS = new Set(['active', 'completed', 'cancelled']);
const SUBSTITUTION_STATUS = new Set(['requested', 'assigned', 'cancelled']);
const ATTENDANCE = new Set(['Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show']);
const TIME_ADJ = new Set(['None', 'Pending', 'Approved', 'Rejected']);
const TIMEZONES = new Set(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function blankNull(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return '';
  return text;
}

function remapJsonIdArray(raw) {
  const text = blankNull(raw);
  if (!text) return '[]';
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return '[]';
    return JSON.stringify(parsed.map((item) => toUuid(item)).filter(Boolean));
  } catch {
    const inner = text.replace(/^\{/, '').replace(/\}$/, '');
    if (!inner) return '[]';
    const parts = inner.split(',').map((item) => item.replace(/^"|"$/g, '').trim());
    return JSON.stringify(parts.map((item) => toUuid(item)).filter(Boolean));
  }
}

function normalizeCell(header, value, fileKey) {
  let next = blankNull(value);

  if (ID_ARRAY_COLUMNS.has(header)) return remapJsonIdArray(next);
  if (ID_COLUMNS.has(header)) return toUuid(next);

  // original_sensei_id di V3 bertipe TEXT — simpan UUID hasil remap jika ada
  if (header === 'original_sensei_id' && next) return toUuid(next);

  if (header === 'timezone') {
    return TIMEZONES.has(next) ? next : 'Asia/Jakarta';
  }

  if (header === 'status' && fileKey === 'schedules_rows') {
    const lower = next.toLowerCase();
    return SCHEDULE_STATUS.has(lower) ? lower : 'active';
  }

  if (header === 'substitution_status') {
    const lower = next.toLowerCase();
    return SUBSTITUTION_STATUS.has(lower) ? lower : '';
  }

  if (header === 'attendance') {
    if (ATTENDANCE.has(next)) return next;
    const map = {
      present: 'Hadir',
      hadir: 'Hadir',
      izin: 'Izin',
      sakit: 'Sakit',
      alpa: 'Alpa',
      absent: 'Alpa',
      'no show': 'No Show',
      noshow: 'No Show'
    };
    return map[next.toLowerCase()] || 'Hadir';
  }

  if (header === 'time_adjustment_status') {
    return TIME_ADJ.has(next) ? next : 'None';
  }

  if (header === 'is_active' || header === 'is_delayed' || header === 'is_extra' || header === 'replacement_secured') {
    if (!next) return '';
    if (/^(true|t|1|yes)$/i.test(next)) return 'true';
    if (/^(false|f|0|no)$/i.test(next)) return 'false';
    return next;
  }

  return next;
}

function fileKey(name) {
  return name.replace(/\.csv$/i, '').toLowerCase();
}

function colIndex(headers, name) {
  return headers.indexOf(name);
}

function collectIds(headers, dataRows) {
  const idx = colIndex(headers, 'id');
  const set = new Set();
  if (idx < 0) return set;
  for (const row of dataRows) {
    const id = blankNull(row[idx]);
    if (id) set.add(id);
  }
  return set;
}

function scrubFk(headers, dataRows, column, validIds) {
  const idx = colIndex(headers, column);
  if (idx < 0 || !validIds) return 0;
  let cleared = 0;
  for (const row of dataRows) {
    const value = blankNull(row[idx]);
    if (value && !validIds.has(value)) {
      row[idx] = '';
      cleared += 1;
    }
  }
  return cleared;
}

function scrubIdArray(headers, dataRows, column, validIds) {
  const idx = colIndex(headers, column);
  if (idx < 0 || !validIds) return 0;
  let changed = 0;
  for (const row of dataRows) {
    const raw = blankNull(row[idx]);
    if (!raw) {
      row[idx] = '[]';
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        row[idx] = '[]';
        changed += 1;
        continue;
      }
      const next = parsed.filter((id) => validIds.has(String(id)));
      if (next.length !== parsed.length) changed += 1;
      row[idx] = JSON.stringify(next);
    } catch {
      row[idx] = '[]';
      changed += 1;
    }
  }
  return changed;
}

async function buildReadyTable(fileName) {
  const key = fileKey(fileName);
  const keepList = KEEP_BY_FILE[key];
  if (key.startsWith('profiles') || keepList === null) {
    return { key, fileName, skip: true, reason: 'profiles / auth' };
  }

  const raw = await readFile(path.join(inputDir, fileName), 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) return { key, fileName, skip: true, reason: 'kosong' };

  const headers = rows[0].map((h) => h.trim());
  const allowed = new Set(keepList);
  const keepIdx = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.header && allowed.has(item.header));
  if (!keepIdx.length) return { key, fileName, skip: true, reason: 'tidak ada kolom cocok' };

  const dropped = headers.filter((h) => h && !allowed.has(h));
  const outHeaders = keepIdx.map((item) => item.header);
  const dataRows = rows.slice(1).map((row) =>
    keepIdx.map(({ header, index }) => normalizeCell(header, row[index] ?? '', key))
  );

  return { key, fileName, skip: false, dropped, headers: outHeaders, dataRows };
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const files = (await readdir(inputDir)).filter((name) => name.toLowerCase().endsWith('.csv'));
  if (!files.length) {
    console.error(`Tidak ada CSV di ${inputDir}`);
    process.exit(1);
  }
  console.log(`Input : ${inputDir}`);
  console.log(`Output: ${outputDir}`);

  const tables = [];
  for (const file of files.sort()) {
    tables.push(await buildReadyTable(file));
  }

  const byKey = Object.fromEntries(tables.filter((t) => !t.skip).map((t) => [t.key, t]));
  const senseiIds = byKey.sensei_rows ? collectIds(byKey.sensei_rows.headers, byKey.sensei_rows.dataRows) : new Set();
  const studentIds = byKey.students_rows
    ? collectIds(byKey.students_rows.headers, byKey.students_rows.dataRows)
    : new Set();
  const groupIds = byKey.groups_rows ? collectIds(byKey.groups_rows.headers, byKey.groups_rows.dataRows) : new Set();
  const scheduleIds = byKey.schedules_rows
    ? collectIds(byKey.schedules_rows.headers, byKey.schedules_rows.dataRows)
    : new Set();

  if (byKey.groups_rows) {
    scrubIdArray(byKey.groups_rows.headers, byKey.groups_rows.dataRows, 'student_ids', studentIds);
  }

  if (byKey.schedules_rows) {
    const s = byKey.schedules_rows;
    const c1 = scrubFk(s.headers, s.dataRows, 'sensei_id', senseiIds);
    const c2 = scrubFk(s.headers, s.dataRows, 'student_id', studentIds);
    const c3 = scrubFk(s.headers, s.dataRows, 'group_id', groupIds);
    const c4 = scrubFk(s.headers, s.dataRows, 'makeup_of_session_id', scheduleIds);
    scrubIdArray(s.headers, s.dataRows, 'student_ids', studentIds);
    console.log(`scrub schedules FK: sensei=${c1}, student=${c2}, group=${c3}, makeup=${c4}`);
  }

  if (byKey.lesson_trackers_rows) {
    const l = byKey.lesson_trackers_rows;
    const c1 = scrubFk(l.headers, l.dataRows, 'schedule_id', scheduleIds);
    const c2 = scrubFk(l.headers, l.dataRows, 'student_id', studentIds);
    const c3 = scrubFk(l.headers, l.dataRows, 'sensei_id', senseiIds);
    console.log(`scrub lesson_trackers FK: schedule=${c1}, student=${c2}, sensei=${c3}`);
  }

  for (const table of tables) {
    if (table.skip) {
      console.log(`skip  ${table.fileName} (${table.reason})`);
      continue;
    }
    const csv =
      [table.headers, ...table.dataRows].map((line) => line.map(escapeCsv).join(',')).join('\n') + '\n';
    const outName = table.fileName.replace(/\.csv$/i, '') + '.ready.csv';
    await writeFile(path.join(outputDir, outName), csv, 'utf8');
    console.log(
      `ok    ${table.fileName} → ${outName} (${table.dataRows.length} rows)` +
        (table.dropped?.length ? ` | drop: ${table.dropped.join(', ')}` : '')
    );
  }

  console.log('\nSelesai. Impor urutan: sensei → students → groups → schedules → lesson_trackers → audit_logs');
  console.log('Penting: groups HARUS diimpor sebelum schedules.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
