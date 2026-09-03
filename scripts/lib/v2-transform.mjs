import { toUuid } from './v2-ids.mjs';

export const KEEP = {
  sensei: [
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
  students: [
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
  groups: ['id', 'name', 'description', 'student_ids', 'updated_at', 'updated_by'],
  schedules: [
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
  lesson_trackers: [
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
  ]
};

const ID_COLUMNS = new Set([
  'id',
  'sensei_id',
  'student_id',
  'group_id',
  'schedule_id',
  'class_id',
  'makeup_of_session_id'
]);

const SCHEDULE_STATUS = new Set(['active', 'completed', 'cancelled']);
const SUBSTITUTION_STATUS = new Set(['requested', 'assigned', 'cancelled']);
const ATTENDANCE = new Set(['Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show']);
const TIME_ADJ = new Set(['None', 'Pending', 'Approved', 'Rejected']);
const TIMEZONES = new Set(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']);

function blank(value) {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null') return '';
  return text;
}

export function remapIdList(value) {
  if (Array.isArray(value)) return value.map((item) => toUuid(item)).filter(Boolean);
  const text = blank(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => toUuid(item)).filter(Boolean);
  } catch {
    /* postgres {a,b} */
  }
  const inner = text.replace(/^\{/, '').replace(/\}$/, '');
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => toUuid(item.replace(/^"|"$/g, '').trim()))
    .filter(Boolean);
}

function idOrNull(value) {
  const id = toUuid(value);
  return id || null;
}

function asBool(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', 't', '1', 'yes'].includes(text)) return true;
  if (['false', 'f', '0', 'no'].includes(text)) return false;
  return fallback;
}

export function pick(row, columns) {
  const out = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(row, column)) out[column] = row[column];
  }
  return out;
}

export function transformRow(table, row) {
  const columns = KEEP[table];
  if (!columns) throw new Error(`Unknown table ${table}`);
  const picked = pick(row, columns);
  const out = {};

  for (const column of columns) {
    let value = picked[column];

    if (column === 'student_ids') {
      out[column] = remapIdList(value);
      continue;
    }

    if (ID_COLUMNS.has(column) || column === 'original_sensei_id') {
      out[column] = column === 'id' ? toUuid(value) : idOrNull(value);
      continue;
    }

    if (column === 'timezone') {
      const text = blank(value);
      out[column] = TIMEZONES.has(text) ? text : 'Asia/Jakarta';
      continue;
    }

    if (column === 'status' && table === 'schedules') {
      const lower = blank(value).toLowerCase();
      out[column] = SCHEDULE_STATUS.has(lower) ? lower : 'active';
      continue;
    }

    if (column === 'substitution_status') {
      const lower = blank(value).toLowerCase();
      out[column] = SUBSTITUTION_STATUS.has(lower) ? lower : null;
      continue;
    }

    if (column === 'attendance') {
      const text = blank(value);
      if (ATTENDANCE.has(text)) {
        out[column] = text;
      } else {
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
        out[column] = map[text.toLowerCase()] || 'Hadir';
      }
      continue;
    }

    if (column === 'time_adjustment_status') {
      const text = blank(value);
      out[column] = TIME_ADJ.has(text) ? text : 'None';
      continue;
    }

    if (
      column === 'is_active' ||
      column === 'is_delayed' ||
      column === 'is_extra' ||
      column === 'replacement_secured'
    ) {
      const fallback = column === 'is_active' ? true : column === 'replacement_secured' ? null : false;
      out[column] = asBool(value, fallback);
      continue;
    }

    if (value === '') out[column] = null;
    else out[column] = value ?? null;
  }

  return out;
}

export function scrubOrphanIds(row, fields, validIds) {
  const next = { ...row };
  let cleared = 0;
  for (const field of fields) {
    const value = next[field];
    if (!value) continue;
    if (!validIds.has(String(value))) {
      next[field] = null;
      cleared += 1;
    }
  }
  return { row: next, cleared };
}
