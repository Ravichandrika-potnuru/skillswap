# Architecture

## Request flow

```text
Browser
  └─ Next.js App Router UI
       ├─ Route Handlers ── Neon Managed Auth
       └─ Route Handlers ── Neon PostgreSQL
                             └─ Drizzle ORM / PostgreSQL driver
```

The Next.js application contains the UI and server-side API routes. `lib/auth.js` resolves the Managed Auth session, loads the corresponding SkillSwap profile, and enforces administrator, approval, and suspension checks. `lib/db.js` provides the PostgreSQL pool and Drizzle schema to route handlers.

Neon Managed Auth owns authentication identities, password hashes, and sessions in its `neon_auth` schema. SkillSwap application data is kept separately. `profiles` stores the app role and student state; the credential-free `users` view supports legacy query shapes.

## Main data model

- `profiles`: email, full name, role, student profile, approval state, and review metadata.
- `skill_categories` and `skills`: discovery categories and student skill listings. A skill's category may be null; category administration protects linked records.
- `swap_requests`: exchange participants, requested and offered skills, workflow status, and completion timestamps.
- `reviews` and `notifications`: exchange feedback and in-app updates.
- `credit_transactions`: the credit ledger, including source references and audited administrator adjustments.
- `audit_log`: administrative actions and associated details.

The schema definitions live in `database/schema.js`; SQL migrations are in `database/migrations/`. See [DATABASE.md](DATABASE.md) before changing the schema.

## Access control

Role checks are enforced by server routes through `requireUser` in `lib/auth.js`; hiding a link or page in the browser is not an authorization boundary. Student approval and suspension restrictions are checked server-side. The admin APIs require an authenticated admin profile.

## Credits

Credit totals are derived from ledger entries and exchange/profile milestones. Achievement progress is derived from credit and exchange activity. Credits are participation recognition points with no cash value and cannot be transferred or redeemed.

## Neon service declarations

`neon.ts` declares the project's Neon services and branch policy. The current web application uses Neon PostgreSQL and Neon Managed Auth. The AI Gateway, Object Storage, Realtime, and sample Function declarations are not presented as user-facing features in this repository until the app has corresponding integrations.
