# Database guide

## Connection choices

- Use Neon pooled `DATABASE_URL` for normal web requests.
- Use direct `DATABASE_URL_UNPOOLED` for migrations and other session-sensitive administration.
- Keep both values in a local or hosting-provider secret store. Never commit them.

The connection and Drizzle setup is in `lib/db.js`; the schema is in `database/schema.js`.

## Migrations

Versioned SQL migrations are in `database/migrations/`, with Drizzle metadata under `database/migrations/meta/`. Run them with:

```powershell
npm run db:migrate
```

Before changing the schema, update the Drizzle definitions, generate or review the SQL migration, and test it against an isolated Neon development branch. Review generated SQL for data changes and locking implications. Apply production migrations deliberately and only after checking the target branch and backup/recovery options.

The migration history includes schema changes and an idempotent credit-ledger backfill based on existing profile/skill state. It contains no embedded connection strings or production profile exports. Do not replay data seeds as a substitute for migrations.

## Tables and relationships

- `profiles` contains SkillSwap account/profile information; auth credentials remain in Neon Managed Auth.
- `skill_categories` groups skills. Skills reference categories with `ON DELETE SET NULL`; the admin API uses safer archive behavior for categories already in use.
- `skills` belongs to a profile and may reference a category.
- `swap_requests` references both participants and both skills; those records restrict unsafe deletions.
- `reviews` references a completed exchange and its participants.
- `notifications` reference profiles and optionally exchanges.
- `credit_transactions` records earnings and administrator adjustments with source/audit information.
- `audit_log` records admin actions.

Consult `database/schema.js` and the migrations for exact constraints and indexes.

## Demo data

The seed scripts generate fictional sample profiles, skills, and exchange history. They require explicit environment opt-in and protect production by default. Demo credentials must be supplied locally through environment variables and must not be committed. Review [SETUP.md](SETUP.md) before running seeds.

## Production data safety

- Do not drop or recreate production tables to repair an app issue.
- Do not run demo seeding or destructive experiments on production.
- Do not commit database dumps, CSV exports, or real student records.
- Prefer additive, reversible migrations and preserve existing IDs and foreign-key relationships.
