# Migrasi data V2 → V3

Panduan impor dari folder backup CSV `backup-ans-v2` ke **project Supabase V3** (bukan V2).

## Sebelum mulai

1. Pastikan kamu buka project **V3 / staging**, bukan `DB ANS SCHEDULE & CRMHNZ` (V2).
2. Di V3, schema sudah lengkap (`schema.sql` + patch V3.1 + `schema-rls.sql`).
3. Folder backup CSV sudah aman di Drive.
4. V2 **tetap jangan dihapus** sampai V3 sudah dicek oke.

## Urutan impor (penting)

Impor lewat **Table Editor → tabel → ⋮ → Import data from CSV** (atau Insert → Import).

Pertahankan kolom **`id`** dari CSV supaya relasi antar tabel tetap nyambung.

| Urutan | Tabel V3 | File CSV (nama umum) | Catatan |
| --- | --- | --- | --- |
| 1 | `sensei` | sensei*.csv | Wajib dulu |
| 2 | `students` | students*.csv | |
| 3 | `groups` | groups*.csv | |
| 4 | `schedules` | schedules* / jadwal*.csv | Butuh sensei/students/groups |
| 5 | `lesson_trackers` | lesson_tracker*.csv | Legacy V2; tetap berguna sebagai history |
| 6 | clock in/out | `session_logs` **atau** kolom di lesson_trackers | Lihat catatan di bawah |
| 7 | `sensei_time_blocks` | bila ada | Opsional |
| 8 | `audit_logs` | bila ada | Opsional |

### Jangan impor dulu (kecuali sudah paham Auth)
- `profiles` — terikat `auth.users`
- Auth users V2 — password tidak ikut di CSV

Setelah data master masuk, buat ulang login Sensei dari dashboard V3 (**Sensei → password login**), email **sama** dengan `sensei.email`.

## Clock in / clock out

V3 membaca clock dari tabel **`session_logs`** (`clock_in_at`, `clock_out_at`, `schedule_id`, `sensei_id`).

- Kalau CSV-mu memang dari `session_logs` → impor ke `session_logs`.
- Kalau clock hanya ada di `lesson_trackers` (`actual_start_time` / `actual_end_time`) → biarkan di `lesson_trackers` dulu (history). Sesi baru di V3 memakai clock V3.

## Setelah impor

1. SQL Editor V3 — cek jumlah baris:

```sql
SELECT 'sensei' AS t, count(*) FROM sensei
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'groups', count(*) FROM groups
UNION ALL SELECT 'schedules', count(*) FROM schedules
UNION ALL SELECT 'lesson_trackers', count(*) FROM lesson_trackers
UNION ALL SELECT 'session_logs', count(*) FROM session_logs;
```

2. Login dashboard V3 sebagai Super Admin.
3. Cek **Sensei**, **Akademik Siswa**, **Jadwal Resmi**.
4. Buat akun login Sensei yang dibutuhkan.
5. Sensei uji login + lihat jadwal sendiri.

## Jika Import CSV gagal

### Error: `invalid input syntax for type uuid: '1777628...'`
ID V2 **bukan UUID** (sering format `timestamp-uuid`). Kolom `id` di V3 bertipe UUID → impor ditolak.

**Jangan edit CSV di Excel** (ID panjang bisa rusak jadi angka saja).

Di laptop (butuh Node.js), dari folder repo / tempat CSV:

```bash
node scripts/remap-v2-csv-ids.mjs ./backup-ans-v2 ./backup-ans-v2-ready
```

Lalu impor file `*.ready.csv` (skip `profiles`).

### Error: `lesson_trackers_schedule_id_fkey` / Key (schedule_id)=(...) is not present in table schedules

Artinya: CSV tracker masih menunjuk `schedule_id` yang **tidak ada di DB V3**, meski `count(*)` schedules sudah besar (mis. 799). Remap saja belum cukup — scrub remap hanya cek CSV schedules, bukan isi DB.

**Perbaiki (wajib pakai ID yang sudah benar-benar di V3):**

1. Di Supabase V3 → Table Editor → `schedules` → Export CSV (simpan mis. `v3-export/schedules.csv`).
2. Scrub tracker terhadap export itu:

```bash
node scripts/scrub-tracker-against-db.mjs ./backup-ans-v2-ready/lesson_trackers_rows.ready.csv ./v3-export/schedules.csv ./backup-ans-v2-ready/lesson_trackers_for_v3.csv
```

3. Impor `lesson_trackers_for_v3.csv` ke V3.

Mode darurat (kosongkan semua `schedule_id`, history tetap masuk):

```bash
node scripts/scrub-tracker-against-db.mjs ./backup-ans-v2-ready/lesson_trackers_rows.ready.csv --clear-schedule ./backup-ans-v2-ready/lesson_trackers_for_v3.csv
```

Penyebab umum lain:
- Salah project (masih di V2)
- Urutan FK salah (schedules sebelum sensei)
- Header CSV tidak cocok / kolom ekstra (`created_at` di sensei) — script remap membuang `created_at`

## Cutover production (belakangan)

Setelah migrasi + uji oke:
1. Vercel production → env `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` arahkan ke project V3
2. Redeploy
3. V2 di-freeze (jangan dihapus dulu 1–2 minggu)
