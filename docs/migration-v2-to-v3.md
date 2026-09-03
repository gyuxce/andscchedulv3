# Migrasi data V2 → V3

Memindahkan data dari project Supabase **V2** ke project **V3**, langsung DB → DB
(tanpa `pg_dump` / backup Pro). Skema V2 mirip V3 tapi beda sebagian kolom, jadi
scriptnya melakukan whitelist kolom + rename + remap id + scrub FK.

## Yang dipindah

`sensei` · `students` · `groups` · `schedules` · `sensei_status` (di-seed) ·
`sensei_availability` · `offdays` · `sensei_time_blocks` · `session_logs`
(`check_in_at` → `clock_in_at`) · `lesson_trackers` · `audit_logs`.

**Tidak** dipindah: `profiles` (terikat `auth.users` — buat ulang login Sensei
dari dashboard), tabel V4 (`chat_*`, `booking_requests`, `notifications`,
`leave_requests`), dan tabel V3-only yang tak ada sumbernya (`class_masters`,
`enrollments`, `session_reports`, `teaching_qa_scores`, `level_completions`,
`app_settings`).

## Langkah

1. Project V3 sudah punya schema lengkap (`db/schema.sql` + `db/schema-rls.sql`).
2. Salin config:

   ```bash
   cp scripts/migrate.local.json.example scripts/migrate.local.json
   ```

   Isi `url` + `serviceKey` (Supabase → Settings → API → `service_role`) untuk
   project **lama** (`from`) dan **baru** (`to`). File ini gitignored.

3. Dry run — cuma hitung baris, tidak menulis:

   ```bash
   npm run migrate:probe   # diff skema V2 vs V3
   npm run migrate:run     # dry run
   ```

4. Jalankan:

   ```bash
   node scripts/migrate-supabase.mjs --apply --wipe   # kosongkan tabel target dulu, lalu impor
   ```

   Flag: `--apply` (tulis), `--wipe` (hapus semua baris target dulu),
   `--overwrite` (timpa baris yang id-nya sama), `--only sensei,students`.

## Setelah migrasi

- Verifikasi: `sensei` / `students` / `schedules` count sesuai V2.
- Buat akun login Sensei dari dashboard (**Sensei → Password login**, email =
  `sensei.email`) — otomatis set `profiles.sensei_id`.
- Jalankan ulang `db/schema-rls.sql` bila belum (index + tuning perf ada di sana).
- Sesi lama akan tampil "Belum mulai" (V2 tak simpan status selesai di
  `schedules`; history akademik ada di `lesson_trackers`).

## Cutover production

1. Env Vercel `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → project V3, redeploy.
2. Freeze V2, jangan dihapus dulu 1–2 minggu.
3. Rotate `service_role` key kedua project (app hanya pakai anon key).
