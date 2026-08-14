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

Login **wajib Supabase Auth** — mode demo lokal sudah dihapus.

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

Tanpa `.env.local` yang valid, layar login meminta konfigurasi (tidak ada role-picker demo).

## Supabase setup (penting)

Ada **2 file SQL**, jangan tertukar:

| File | Dipakai di mana |
| --- | --- |
| `schema.sql` | **Project Supabase BARU / kosong** (staging V3) |
| `schema-v3.sql` | Project yang **sudah punya** tabel V2 (`sensei`, `schedules`, …) |
| `schema-timezone-settings.sql` | Staging yang **sudah jalan** — tambah timezone Sensei + `app_settings` (grace late-join) |
| `schema-level-completions.sql` | Staging yang **sudah jalan** — tabel `level_completions` |
| `schema-class-master.sql` | Staging yang **sudah jalan** — Class Master + `schedules.class_id` |
| `schema-enrollments.sql` | Staging yang **sudah jalan** — Enrollment / Learning Journey + `session_reports.material_url` |

### Yang kamu lakukan sekarang
1. Buat / buka **project Supabase baru** (bukan produksi V2).
2. Buka **SQL Editor**.
3. Paste isi **`schema.sql`** → Run.
4. Kalau sukses, di Table Editor harus muncul `sensei`, `schedules`, `session_reports`, dll.

### Staging yang sudah pernah di-setup
Jalankan berurutan (jangan loncat):
1. `schema-timezone-settings.sql`
2. `schema-level-completions.sql`
3. **`schema-class-master.sql`** ← wajib sebelum enrollments
4. **`schema-enrollments.sql`**
5. `schema-rls.sql` ulang

Kalau error `relation "class_masters" does not exist`, berarti langkah 3 belum dijalankan.

### Setelah schema.sql sukses
1. **Wajib:** jalankan `schema-rls.sql` (kunci RBAC Super Admin / Kyouiku / Sensei)
2. Copy `.env.example` → `.env.local`
3. Isi dari Supabase → Project Settings → API:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. (Opsional) jalankan `seed-demo.sql` untuk isi Sensei/siswa contoh
5. Buat user di **Authentication → Users** (email + password)
6. Di Table Editor `profiles`, set:
   - Super Admin: `role = Super Admin`, `status = Approved`
   - Kyouiku: `role = Kyouiku`, `status = Approved`
   - Sensei: `role = Sensei`, `status = Approved`, email sama dengan baris `sensei.email`
7. Di tab **Sensei**, set timezone (WIB/WITA/WIT). Di **Pengaturan**, set grace late-join (menit).
8. Makeup: batalkan kelas → **Jadwalkan makeup**. Level completion: tab Akademik Siswa → **Complete level**.
9. `npm install && npm run dev` → login pakai email/password itu

### Cek RLS cepat
Login 3 role, pastikan:
- Sensei **tidak** bisa create/edit jadwal resmi orang lain
- Sensei hanya lihat kelas / ketersediaan sendiri
- Kyouiku bisa lihat semua + input QA + tandai level selesai, **tidak** bisa assign/swap kelas
- Super Admin bisa manage users + jadwal resmi + settings + makeup

## V2 continuity

V2 production stays live. Additive changes go to staging first. Do not rename or drop V2 columns that the live app still writes.

## Open Kyouiku decisions still TBC

- Exact attendance % treatment of Late / Excused / Partial / cancelled
- Minimum attendance for level completion
- Sensei visibility of own QA/disciplinary/recording details
