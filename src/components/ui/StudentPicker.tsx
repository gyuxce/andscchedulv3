import { useMemo, useState } from 'react';
import type { Student } from '../../types';

export function StudentPicker({
  students,
  value,
  onChange,
  disabled
}: {
  students: Student[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.phone?.includes(q) ||
        item.currentLevel.toLowerCase().includes(q)
    );
  }, [students, query]);

  return (
    <div className="space-y-2">
      <input
        className="ui-input"
        placeholder="Cari siswa (nama / WA / email / level)"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-xs text-ink-soft">Tidak ada siswa cocok.</p>
        ) : (
          filtered.map((student) => {
            const checked = value.includes(student.id);
            return (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-paper"
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? value.filter((id) => id !== student.id) : [...value, student.id])
                  }
                />
                <span className="text-sm">
                  <span className="font-semibold">{student.name}</span>
                  <span className="text-ink-soft">
                    {' '}
                    · {student.currentLevel || '—'} · {student.type}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      {value.length > 0 ? <p className="text-xs text-ink-soft">{value.length} siswa dipilih</p> : null}
    </div>
  );
}
