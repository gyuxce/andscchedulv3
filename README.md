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

## V2 continuity

V2 production stays live. `schema-v3.sql` is additive and must be applied only to staging after backup. Do not rename or drop V2 columns that the live app still writes.

## Open Kyouiku decisions still TBC

- Exact attendance % treatment of Late / Excused / Partial / cancelled
- Minimum attendance for level completion
- Makeup counting policy
- Late-join grace period
- Sensei visibility of own QA/disciplinary/recording details
