# SkillSwap

**Learn Something. Teach Something. Grow Together.**

SkillSwap is a student-to-student skill exchange platform. Students can share skills they teach, find skills they want to learn, and coordinate peer exchanges. Student accounts require administrator approval for full participation.

## Features

### Students

- Create a profile and list skills to teach or learn.
- Browse and filter skills shared by approved students.
- Send and manage exchange requests, record completion, and leave reviews.
- View notifications, a student leaderboard, and their profile.
- Earn **SkillSwap Credits** for documented learning and teaching milestones. Credits are recognition points with no cash value and cannot be transferred or redeemed.

### Administrators

- Review student registrations and manage account status.
- Moderate skills and manage skill categories.
- Review exchange activity and manage credit adjustments with an audit trail.

### Authentication and data

- Neon Managed Auth (Better Auth) handles email/password identities and sessions.
- SkillSwap stores application profiles, roles, approval status, skills, exchanges, reviews, notifications, and credit transactions in Neon PostgreSQL.
- Server routes enforce role and account-status checks.

## Screenshots

No application screenshots are included in this repository yet. Add reviewed, non-sensitive captures under `docs/screenshots/` and link them here. Do not include real student records, email addresses, or administrative information in public screenshots.

## Technology

- Next.js App Router and React
- Neon PostgreSQL and Neon Managed Auth
- Drizzle ORM and migrations
- `@neondatabase/serverless`
- ESLint

The Neon project configuration also declares optional Neon services in `neon.ts`; the application flows documented above currently use PostgreSQL and Managed Auth.

## Requirements

- Node.js 22 or later
- A Neon project with PostgreSQL and Managed Auth configured
- A development branch and credentials for that branch

## Installation

```powershell
npm ci
Copy-Item .env.example .env.local
```

Fill `.env.local` with the values for your own Neon development branch. The application uses the pooled `DATABASE_URL`; migrations prefer the direct `DATABASE_URL_UNPOOLED` connection. Set `NEON_AUTH_BASE_URL` (or its `BETTER_AUTH_URL` fallback) to the branch's auth base URL, and set `BETTER_AUTH_SECRET` to a random value of at least 32 characters. Keep these values private.

See [Local setup](docs/SETUP.md) for environment details and [Database guide](docs/DATABASE.md) for migrations and schema notes.

## Migrations and optional demo data

Apply schema migrations to your chosen development branch:

```powershell
npm run db:migrate
```

The demo scripts create fictional profiles and sample activity. They are disabled by default and include production safeguards. Use them only on an isolated development branch after reviewing their safeguards; provide any demo passwords through local environment variables. Never commit demo passwords or point a demo seed command at production.

```powershell
npm run db:seed-demo
npm run db:seed-demo-data
```

See [Database guide](docs/DATABASE.md) before changing or applying migrations.

## Development commands

```powershell
npm run dev          # Windows launcher; resolves Neon endpoints for local development
npm run dev:raw      # Start Next.js directly when DNS resolution already works
npm run lint
npm run test:auth
npm run build
npm start            # Serve a production build locally
```

## Deployment

The app can be deployed to a Node.js-compatible Next.js host such as Vercel. Configure the production branch's pooled database URL, Neon Auth URL, a unique `BETTER_AUTH_SECRET`, and the public `APP_URL` in the hosting provider's server-side environment settings. Apply migrations once using the direct database URL before deploying code that requires them. Configure the Neon Auth trusted domain and email delivery for the deployed host. Keep demo seeding disabled in production.

Do not expose database URLs, auth secrets, email-provider keys, demo passwords, or Neon service tokens through `NEXT_PUBLIC_*` variables.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. For vulnerability reports, see [SECURITY.md](SECURITY.md). Do not publish secrets, database dumps, or private student information.
