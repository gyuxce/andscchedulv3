# ANS Dashboard V3

Operational & academic dashboard for **Aki No Sora × ILUSA** — classes, Sensei
availability, session execution, Kyouiku QA, and Action Center monitoring.
Business/CRM (acquisition, payment, churn, membership) is intentionally out of scope.

> Proprietary — internal tool. See [`LICENSE`](LICENSE).

## Stack

React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 · Zustand ·
Supabase (Postgres + Auth + RLS) · Vitest.

## Roles

| Role | Scope |
| --- | --- |
| Super Admin / Ops | Full control: schedule CRUD, assign/swap, overrides (audited), users |
| Kyouiku / Head Sensei | View schedules & Sensei ops, input Teaching Performance, review recordings |
| Sensei | Own availability, own clock-in/out, own session reports (data scoped by RLS) |

Student login is reserved for V4.

## Functional pillars

1. **Schedule & class ops** — Sensei availability is a separate object from the official schedule.
2. **Academic execution** — attendance, performance, progress, notes, recording ref, per student.
3. **Sensei management & QA** — ACTIVE/INACTIVE + NEW/UNASSIGNED/CUTI labels; 16h weekly target; manual QA 0–100.
4. **Operational monitoring** — Action Center: missing reports/recordings, late joins, conflicts, unassigned Sensei, hour gaps.

## Local run

```bash
cp .env.example .env.local     # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:3000
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build → `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` | Vitest |
| `npm run migrate:probe` | diff V2 vs V3 schema |
| `npm run migrate:run` | V2 → V3 data migration (dry run without `--apply`) |

## Database

SQL lives in [`db/`](db/) — see [`db/README.md`](db/README.md) for run order.
Quick start (new project): run `db/schema.sql` then `db/schema-rls.sql` in the
Supabase SQL Editor, then create a user in Authentication and set its
`profiles.role = 'Super Admin'`, `status = 'Approved'`.

Create Sensei logins from the dashboard: **Sensei → open a Sensei → Password
login** (email must match `sensei.email`; this also sets `profiles.sensei_id`).
In Supabase → Authentication → Providers → Email, turn off **Confirm email** for
staging so accounts work immediately.

**V2 → V3 data migration:** [`docs/migration-v2-to-v3.md`](docs/migration-v2-to-v3.md).

## Project layout

```
src/
  components/   views + layout + ui primitives
  lib/          pure domain logic (tested) + helpers
  services/     Supabase IO
  store/        Zustand store (orchestration)
db/             SQL schema + RLS + migrations
docs/           guides
scripts/        one-off tooling (migration, schema probe)
```

## Deploy (Vercel)

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Build `npm run build`, output `dist`.

## Open Kyouiku decisions (TBC)

- Attendance % treatment of Late / Excused / Partial / cancelled
- Minimum attendance for level completion
- Sensei visibility of own QA / disciplinary / recording detail
