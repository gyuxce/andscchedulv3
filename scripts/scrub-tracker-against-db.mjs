#!/usr/bin/env node
/**
 * Kosongkan FK lesson_trackers yang tidak ada di schedules / students / sensei
 * yang SUDAH ADA di V3 (bukan hanya di CSV remap).
 *
 * Kenapa perlu: remap scrub hanya cek CSV schedules. Kalau baris schedule gagal
 * masuk ke DB V3, schedule_id tetap ada di tracker CSV → import FK 23503.
 *
 * Pakai (PowerShell):
 *   1) Supabase V3 → Table Editor → schedules → Export CSV (cukup kolom id)
 *      Simpan mis. .\v3-export\schedules.csv
 *   2) Opsional: export students.csv + sensei.csv juga
 *   3) node scripts\scrub-tracker-against-db.mjs `
 *        .\backup-ans-v2-ready\lesson_trackers_rows.ready.csv `
 *        .\v3-export\schedules.csv `
 *        .\backup-ans-v2-ready\lesson_trackers_for_v3.csv `
 *        .\v3-export\students.csv `
 *        .\v3-export\sensei.csv
 *
 * Lalu impor lesson_trackers_for_v3.csv ke V3.
 *
 * Mode darurat (hapus SEMUA schedule_id):
 *   node scripts\scrub-tracker-against-db.mjs tracker.csv --clear-schedule out.csv
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

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

function blank(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return '';
  return text;
}

async function loadIdSet(filePath) {
  if (!filePath) return null;
  const rows = parseCsv(await readFile(filePath, 'utf8'));
  if (!rows.length) return new Set();
  const headers = rows[0].map((h) => h.trim());
  const idIdx = headers.indexOf('id');
  if (idIdx < 0) {
    throw new Error(`${filePath}: kolom "id" tidak ditemukan`);
  }
  const set = new Set();
  for (const row of rows.slice(1)) {
    const id = blank(row[idIdx]).toLowerCase();
    if (id) set.add(id);
  }
  return set;
}

function scrubColumn(headers, dataRows, column, validIds) {
  const idx = headers.indexOf(column);
  if (idx < 0) return 0;
  let cleared = 0;
  for (const row of dataRows) {
    const value = blank(row[idx]);
    if (!value) continue;
    if (!validIds || !validIds.has(value.toLowerCase())) {
      row[idx] = '';
      cleared += 1;
    }
  }
  return cleared;
}

async function main() {
  const trackerPath = process.argv[2];
  const schedulesOrFlag = process.argv[3];
  const outPath = process.argv[4];
  const studentsPath = process.argv[5];
  const senseiPath = process.argv[6];

  if (!trackerPath || !schedulesOrFlag || !outPath) {
    console.error(`Usage:
  node scripts/scrub-tracker-against-db.mjs <tracker.csv> <schedules-from-v3.csv> <out.csv> [students.csv] [sensei.csv]
  node scripts/scrub-tracker-against-db.mjs <tracker.csv> --clear-schedule <out.csv>`);
    process.exit(1);
  }

  const clearAllSchedule = schedulesOrFlag === '--clear-schedule';
  const trackerRows = parseCsv(await readFile(trackerPath, 'utf8'));
  if (trackerRows.length < 2) {
    console.error('tracker CSV kosong');
    process.exit(1);
  }

  const headers = trackerRows[0].map((h) => h.trim());
  const dataRows = trackerRows.slice(1).map((row) => [...row]);

  let scheduleCleared = 0;
  if (clearAllSchedule) {
    scheduleCleared = scrubColumn(headers, dataRows, 'schedule_id', null);
    console.log(`clear ALL schedule_id: ${scheduleCleared}`);
  } else {
    const scheduleIds = await loadIdSet(schedulesOrFlag);
    scheduleCleared = scrubColumn(headers, dataRows, 'schedule_id', scheduleIds);
    console.log(`schedules di V3 export: ${scheduleIds.size}`);
    console.log(`scrub schedule_id orphan: ${scheduleCleared}`);
  }

  if (studentsPath) {
    const studentIds = await loadIdSet(studentsPath);
    const n = scrubColumn(headers, dataRows, 'student_id', studentIds);
    console.log(`scrub student_id orphan: ${n} (students=${studentIds.size})`);
  }
  if (senseiPath) {
    const senseiIds = await loadIdSet(senseiPath);
    const n = scrubColumn(headers, dataRows, 'sensei_id', senseiIds);
    console.log(`scrub sensei_id orphan: ${n} (sensei=${senseiIds.size})`);
  }

  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  const csv = [headers, ...dataRows].map((line) => line.map(escapeCsv).join(',')).join('\n') + '\n';
  await writeFile(outPath, csv, 'utf8');
  console.log(`ok → ${outPath} (${dataRows.length} rows)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
