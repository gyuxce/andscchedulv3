# ANS Dashboard V3

Operational and academic dashboard for **Aki No Sora × ILUSA**.

V3 runs classes, Sensei availability, session execution, Kyouiku QA, and Action Center monitoring. Business/CRM functions (acquisition, payment, churn, membership) are intentionally out of scope.

## Roles

| Role | What they can do |
| --- | --- |
| Super Admin / Ops | Full operational control, official schedule CRUD, assign/swap, overrides with audit, users |
| Kyouiku / Head Sensei | View schedules and Sensei ops, input Teaching Performance, review recordings |
| Sensei | Own availability, own clock-in/out, own session reports |

Student login is reserved for V4. Student records in V3 exist only for learning operations.

## Functional pillars

1. **Schedule & class operations** — Sensei availability is a separate object from the official class schedule.
2. **Academic execution** — attendance, performance, progress, notes, recording reference, per student for Group/Semi-Private.
3. **Sensei management & QA** — ACTIVE/INACTIVE plus NEW, UNASSIGNED, CUTI labels; 16-hour weekly target; manual QA 0–100.
4. **Operational monitoring** — Action Center for missing reports/recordings, late joins, conflicts, unassigned Sensei, weekly-hour gaps.

## Local run

Login memakai akun resmi yang sudah diaktifkan (email + password).

```bash
cp .env.example .env.local
# isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Database setup

| File | Dipakai di mana |
| --- | --- |
| `schema.sql` | Project database **baru / kosong** |
| `schema-v3.sql` | Project yang **sudah punya** tabel lama (`sensei`, `schedules`, …) |
| `schema-timezone-settings.sql` | Additive — timezone Sensei + `app_settings` |
| `schema-level-completions.sql` | Additive — `level_completions` |
| `schema-class-master.sql` | Additive — Class Master + `schedules.class_id` |
| `schema-enrollments.sql` | Additive — Enrollment dasar |
| `schema-v31-master-data.sql` | Additive — V3.1 Sensei display_name + enrollment payment/progress/status |
| `schema-v31-recurring-eom.sql` | Additive — projected_end_date + schedules.is_extra (CONTEXT Update 11.14) |
| `schema-rls.sql` | RBAC policies (jalankan ulang setelah schema additive) |
| `cleanup-demo-data.sql` | Hapus data seed/demo dari project live |

Re-sync data dari V2 (admin masih input di V2): lihat **`MIGRATION-V2-TO-V3.md`**.

### Buat akun login Sensei dari dashboard
1. Login sebagai **Super Admin**
2. **Sensei → + Tambah Sensei** (atau buka Sensei yang sudah ada)
3. Isi email + **Password login** / ulangi password
4. Simpan / **Buat akun login sekarang**
5. Sensei login di halaman masuk dengan email + password itu

Catatan: di Supabase → Authentication → Providers → Email, matikan **Confirm email** untuk staging agar akun langsung bisa dipakai.

### Project baru
1. Buka SQL Editor.
2. Jalankan **`schema.sql`**, lalu **`schema-rls.sql`**.
3. Set env `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (lokal atau Vercel).
4. Buat user di Authentication, lalu di `profiles` set `role` + `status = Approved`.
5. Sensei: samakan email Auth dengan `sensei.email`.

### Project yang sudah jalan
Jalankan berurutan (jangan loncat):
1. `schema-timezone-settings.sql`
2. `schema-level-completions.sql`
3. `schema-class-master.sql`
4. `schema-enrollments.sql`
5. **`schema-v31-master-data.sql`**
6. **`schema-v31-recurring-eom.sql`**
7. **`schema-profiles-sensei-id.sql`** ← tautkan login Sensei ke master (`profiles.sensei_id`)
8. `schema-rls.sql` ulang

Kalau Sensei tidak bisa isi Ketersediaan (“belum tertaut”): pastikan `sensei.email` = email Auth, atau set `profiles.sensei_id`, lalu login ulang.

Kalau masih ada data seed lama, jalankan **`cleanup-demo-data.sql`**, lalu hapus user demo di Authentication → Users.

## Deploy (Vercel)

Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Build: `npm run build` · Output: `dist`

## Open Kyouiku decisions still TBC

- Exact attendance % treatment of Late / Excused / Partial / cancelled
- Minimum attendance for level completion
- Sensei visibility of own QA/disciplinary/recording details
