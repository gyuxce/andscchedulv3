# Database (Supabase / Postgres)

Semua file dijalankan lewat **Supabase → SQL Editor**. Aman diulang (idempotent).

## Project baru / kosong

| Urutan | File | Isi |
| --- | --- | --- |
| 1 | `schema.sql` | Semua tabel + RLS enable + fungsi bootstrap |
| 2 | `schema-rls.sql` | Policy RBAC (Super Admin / Kyouiku / Sensei) + index + tuning perf |

Lalu: buat user di **Authentication**, set `profiles.role = 'Super Admin'`, `status = 'Approved'`.

## Project lama yang sudah punya tabel V2 (`sensei`, `schedules`, …)

Jalankan berurutan (jangan loncat):

| Urutan | File |
| --- | --- |
| 1 | `schema-timezone-settings.sql` — timezone Sensei + `app_settings` |
| 2 | `schema-level-completions.sql` — tabel `level_completions` |
| 3 | `schema-class-master.sql` — Class Master + `schedules.class_id` |
| 4 | `schema-enrollments.sql` — enrollment dasar (butuh `class_masters` dulu) |
| 5 | `schema-v31-master-data.sql` — Sensei `display_name` + enrollment payment/progress/status |
| 6 | `schema-v31-recurring-eom.sql` — `projected_end_date` + `schedules.is_extra` |
| 7 | `schema-profiles-sensei-id.sql` — `profiles.sensei_id` (tautan login Sensei ↔ master) |
| 8 | `schema-rls.sql` — **jalankan ulang** setelah semua patch additive |

`schema-v3.sql` = alternatif `schema.sql` untuk project yang sudah punya tabel legacy V2.

## Utility

- `cleanup-demo-data.sql` — hapus baris seed/demo dari project live.

## Migrasi data V2 → V3

Lihat [`../docs/migration-v2-to-v3.md`](../docs/migration-v2-to-v3.md) dan `scripts/migrate-supabase.mjs`.
