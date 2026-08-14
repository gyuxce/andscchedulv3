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

## Local demo

This staging app uses in-memory/localStorage demo data so V3 can be explored without touching the live V2 Supabase database.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a demo role:

- Super Admin — `ops@akinosora.co`
- Kyouiku — `kyouiku@akinosora.co`
- Sensei — `yuki.tanaka@akinosora.co`

```bash
npm test
npm run build
```

## Supabase setup (penting)

Ada **2 file SQL**, jangan tertukar:

| File | Dipakai di mana |
| --- | --- |
| `schema.sql` | **Project Supabase BARU / kosong** (staging V3) |
| `schema-v3.sql` | Project yang **sudah punya** tabel V2 (`sensei`, `schedules`, …) |

### Yang kamu lakukan sekarang
1. Buat / buka **project Supabase baru** (bukan produksi V2).
2. Buka **SQL Editor**.
3. Paste isi **`schema.sql`** → Run.
4. Kalau sukses, di Table Editor harus muncul `sensei`, `schedules`, `session_reports`, dll.

### Setelah schema.sql sukses
1. Copy `.env.example` → `.env.local`
2. Isi dari Supabase → Project Settings → API:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. (Opsional) jalankan `seed-demo.sql` untuk isi Sensei/siswa contoh
4. Buat user di **Authentication → Users** (email + password)
5. Di Table Editor `profiles`, set:
   - Super Admin: `role = Super Admin`, `status = Approved`
   - Kyouiku: `role = Kyouiku`, `status = Approved`
   - Sensei: `role = Sensei`, `status = Approved`, email sama dengan baris `sensei.email`
6. `npm install && npm run dev` → login pakai email/password itu

Tanpa `.env.local`, app tetap bisa dibuka dalam **mode demo lokal**.

## V2 continuity

V2 production stays live. Additive changes go to staging first. Do not rename or drop V2 columns that the live app still writes.

## Open Kyouiku decisions still TBC

- Exact attendance % treatment of Late / Excused / Partial / cancelled
- Minimum attendance for level completion
- Makeup counting policy
- Late-join grace period
- Sensei visibility of own QA/disciplinary/recording details
