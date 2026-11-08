# Local setup

## Requirements

- Node.js 22 or later and npm
- A Neon project with PostgreSQL and Neon Managed Auth enabled
- A development branch with the SkillSwap migrations applied

Use a development branch for local work. Do not point demo seed commands at production.

## Install

```powershell
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` with your branch's values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL for application requests. |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL URL, preferred for migrations. |
| `NEON_AUTH_BASE_URL` | Neon Managed Auth URL. `BETTER_AUTH_URL` is supported as a fallback. |
| `BETTER_AUTH_SECRET` | Private random value of at least 32 characters for auth cookies. |
| `APP_URL` | Application origin, such as `http://localhost:3000`. |
| `ADMIN_CONTACT_EMAIL` | Optional contact address shown by support-related UI. |
| `EMAIL_PROVIDER`, `EMAIL_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM` | Optional app email adapter configuration. Email sends are disabled by default. |
| `REQUIRE_EMAIL_VERIFICATION` | Whether the app independently requires verified email for restricted student actions. |
| `ENABLE_DEMO_ACCOUNTS` | Explicit opt-in for demo seed scripts. Leave `false` by default. |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD` | Optional demo-only credentials. Keep these local and use fictional accounts. |

Never copy live credentials into `.env.example`, source files, screenshots, or Git. `.env.local` is ignored by Git.

## Apply migrations

```powershell
npm run db:migrate
```

The migration runner prefers `DATABASE_URL_UNPOOLED`. Review [DATABASE.md](DATABASE.md) before applying schema changes. Managed Auth's `neon_auth` tables are owned by Neon; do not recreate or edit them with SkillSwap migrations.

## Optional fictional demo data

On an isolated development branch only, configure demo credentials in `.env.local`, set `ENABLE_DEMO_ACCOUNTS=true`, and run only the seed commands you need:

```powershell
npm run db:seed-demo
npm run db:seed-demo-data
```

These commands create fictional profiles and sample data. They include production guards, but a production override exists for controlled project administration; do not set it for routine development. Review the script before running it and never reuse real people's credentials.

## Start the app

```powershell
npm run dev
```

On Windows, the launcher resolves the Neon host addresses for local development and writes only local DNS override values to `.env.local`; TLS still verifies the original hostname. If your machine resolves the Neon endpoints normally, `npm run dev:raw` starts Next.js without that launcher.

Open `http://localhost:3000`.

## Checks

```powershell
npm run lint
npm run test:auth
npm run build
```

## Deployment notes

Set the production branch's pooled database URL, direct migration URL, Neon Auth URL, a unique `BETTER_AUTH_SECRET`, and the deployed `APP_URL` in the host's server-side environment configuration. Apply migrations separately using the direct URL. Configure the deployed origin as an allowed Neon Auth domain and configure email delivery if those flows are enabled. Keep demo seeding disabled.
