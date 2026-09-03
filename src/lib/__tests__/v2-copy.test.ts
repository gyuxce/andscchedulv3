import { describe, expect, it } from 'vitest';
import { isUuid, toUuid } from '../../../scripts/lib/v2-ids.mjs';
import { remapIdList, scrubOrphanIds, transformRow } from '../../../scripts/lib/v2-transform.mjs';

describe('V2 id remap', () => {
  it('keeps valid UUIDs and hashes legacy ids stably', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(toUuid(uuid)).toBe(uuid);
    const a = toUuid('1777628123456-not-a-uuid');
    const b = toUuid('1777628123456-not-a-uuid');
    expect(a).toBe(b);
    expect(isUuid(a)).toBe(true);
    expect(a).not.toBe(toUuid('other-legacy-id'));
  });
});

describe('V2 row transform', () => {
  it('whitelists schedule columns, remaps FKs, and drops extra V2 fields', () => {
    const row = transformRow('schedules', {
      id: 'sched-1',
      sensei_id: 'sensei-1',
      student_id: 'st-1',
      student_ids: ['st-1', 'st-2'],
      type: 'Private',
      level: 'N5',
      date: '2026-09-03',
      start_time: '19:00',
      end_time: '20:30',
      status: 'Active',
      created_at: 'should-drop',
      bpo_field: 'should-drop'
    });
    expect(isUuid(row.id)).toBe(true);
    expect(row.id).toBe(toUuid('sched-1'));
    expect(row.sensei_id).toBe(toUuid('sensei-1'));
    expect(row.student_ids).toEqual([toUuid('st-1'), toUuid('st-2')]);
    expect(row.status).toBe('active');
    expect(row.bpo_field).toBeUndefined();
    expect(row.created_at).toBeUndefined();
  });

  it('scrubs orphan FKs and remaps json student_ids', () => {
    expect(remapIdList('["a","b"]')).toEqual([toUuid('a'), toUuid('b')]);
    const { row, cleared } = scrubOrphanIds(
      { schedule_id: toUuid('missing'), student_id: toUuid('ok') },
      ['schedule_id'],
      new Set([toUuid('ok')])
    );
    expect(cleared).toBe(1);
    expect(row.schedule_id).toBeNull();
    expect(row.student_id).toBe(toUuid('ok'));
  });
});
