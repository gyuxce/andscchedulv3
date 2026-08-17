#!/usr/bin/env node
/**
 * Remap V2 CSV IDs → UUID valid untuk impor ke Supabase V3.
 *
 * V2 sering pakai id seperti:
 *   1777628410378-73887b85-9c8f-4932-a742-dfe20f1ee0d2
 * itu BUKAN UUID, jadi impor ke kolom uuid gagal.
 *
 * Pakai:
 *   node scripts/remap-v2-csv-ids.mjs ./backup-ans-v2 ./backup-ans-v2-ready
 *
 * Lalu impor file di folder *-ready (skip profiles).
 *
 * PENTING: jangan buka CSV di Excel dulu (ID panjang bisa rusak).
 * Pakai file asli unduhan Supabase.
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inputDir = path.resolve(process.argv[2] || './backup-ans-v2');
const outputDir = path.resolve(process.argv[3] || './backup-ans-v2-ready');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Kolom yang berisi id tunggal / FK yang perlu di-remap */
const ID_COLUMNS = new Set([
  'id',
  'sensei_id',
  'student_id',
  'group_id',
  'schedule_id',
  'class_id',
  'makeup_of_session_id',
  'original_sensei_id',
  'session_report_id',
  'actor_id'
]);

/** Kolom JSON array of ids */
const ID_ARRAY_COLUMNS = new Set(['student_ids']);

/** Kolom buang (tidak ada / bermasalah di target V3 tertentu) */
const DROP_BY_FILE = {
  sensei_rows: ['created_at', 'updated_at'],
  students_rows: ['created_at', 'updated_at'],
  groups_rows: [],
  schedules_rows: [],
  lesson_trackers_rows: [],
  audit_logs_rows: [],
  profiles_rows: null // skip file
};

function toUuid(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'null') return '';
  if (UUID_RE.test(raw)) return raw.toLowerCase();
  const hash = createHash('sha1').update(`ans-v2-id:${raw}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

function remapJsonIdArray(raw) {
  const text = String(raw ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return '[]';
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return '[]';
    return JSON.stringify(parsed.map((item) => toUuid(item)).filter(Boolean));
  } catch {
    // postgres style {a,b}
    const inner = text.replace(/^\{/, '').replace(/\}$/, '');
    if (!inner) return '[]';
    const parts = inner.split(',').map((item) => item.replace(/^"|"$/g, '').trim());
    return JSON.stringify(parts.map((item) => toUuid(item)).filter(Boolean));
  }
}

function fileKey(name) {
  return name.replace(/\.csv$/i, '').toLowerCase();
}

async function processFile(fileName) {
  const key = fileKey(fileName);
  if (key.startsWith('profiles') || DROP_BY_FILE[key] === null) {
    console.log(`skip  ${fileName} (profiles / auth — buat login di dashboard V3)`);
    return;
  }

  const raw = await readFile(path.join(inputDir, fileName), 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.log(`skip  ${fileName} (kosong)`);
    return;
  }

  const headers = rows[0].map((h) => h.trim());
  const drop = new Set(DROP_BY_FILE[key] || ['created_at']);
  const keepIdx = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.header && !drop.has(item.header));

  const outHeaders = keepIdx.map((item) => item.header);
  const outRows = [outHeaders];

  for (const row of rows.slice(1)) {
    const next = keepIdx.map(({ header, index }) => {
      const value = row[index] ?? '';
      if (ID_ARRAY_COLUMNS.has(header)) return remapJsonIdArray(value);
      if (ID_COLUMNS.has(header)) return toUuid(value);
      return value;
    });
    outRows.push(next);
  }

  const csv = outRows.map((line) => line.map(escapeCsv).join(',')).join('\n') + '\n';
  const outName = fileName.replace(/\.csv$/i, '') + '.ready.csv';
  await writeFile(path.join(outputDir, outName), csv, 'utf8');
  console.log(`ok    ${fileName} → ${outName} (${outRows.length - 1} rows)`);
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
  for (const file of files.sort()) {
    await processFile(file);
  }
  console.log('\nSelesai. Impor file *.ready.csv ke V3 sesuai urutan di MIGRATION-V2-TO-V3.md');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
