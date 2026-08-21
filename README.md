# Lord of Scrum — Planning Poker

A LOTR-themed Scrum Planning Poker tool for agile teams. Create sessions, invite your fellowship, vote on estimates in real time, and reach consensus — all with a touch of Middle-earth magic.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) — unified frontend + API |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Real-time | Ably (managed pub/sub) |
| Styling | Tailwind CSS + shadcn/ui + LOTR theme |
| Auth | NextAuth.js (optional GitHub/Google OAuth) |
| State | TanStack Query v5 |
| Validation | Zod |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest + Testing Library + Playwright |
| Hosting | Vercel (zero-cost) |
| Monitoring | Sentry (free tier) |

## Project Structure

```text
.
├── apps/
│   └── web/                       # Next.js application
│       ├── src/
│       │   ├── app/               # App Router pages + API routes
│       │   ├── domain/            # Pure business logic (entities, rules, errors)
│       │   ├── application/       # Use cases, ports, DTOs
│       │   ├── infrastructure/    # Prisma repos, Ably publisher, auth
│       │   ├── features/          # Feature components (voting, participants, rounds)
│       │   ├── components/        # Shared UI components
│       │   ├── hooks/             # React hooks
│       │   ├── lib/               # Utilities (API errors, query keys, deps)
│       │   ├── styles/            # Global CSS
│       │   └── types/             # TypeScript type augmentations
│       ├── prisma/                # Schema, migrations, seed
│       ├── tests/                 # Unit tests (Vitest)
│       ├── e2e/                   # End-to-end tests (Playwright)
│       └── public/                # Static assets
├── packages/
│   └── config/                    # Shared config (future)
├── docs/                          # Architecture & engineering docs (12 files)
├── specs/                         # Planning & delivery tracking
├── turbo.json                     # Turborepo task config
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- **Node.js** 18+ 
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** — or a free [Neon](https://neon.tech) database
- **Ably** account — free tier at [ably.com](https://ably.com)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url> lorofscrum
cd lorofscrum
pnpm install
```

### 2. Set up environment variables

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` with your values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth.js (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `ABLY_API_KEY` | Your Ably API key |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional — for GitHub OAuth sign-in |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — for Google OAuth sign-in |
| `CRON_SECRET` | Secret for the cleanup cron endpoint |

### 3. Set up the database

```bash
cd apps/web
npx prisma migrate dev --name init
npx prisma db seed
```

This creates all tables and seeds the default estimation scales (Fibonacci, T-Shirt, Powers of 2, Sequencial).

### 4. Run the development server

```bash
# From the repo root
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the Lord of Scrum landing page.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) — see [Testing](#testing) |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed database with default scales |
| `pnpm db:studio` | Open Prisma Studio |

## Testing

```bash
pnpm test        # unit tests (Vitest)
pnpm lint        # ESLint + tsc --noEmit
pnpm test:e2e    # end-to-end tests (Playwright)
```

### End-to-end setup

The E2E suite drives a real browser against a real server and a real database,
so it needs its own PostgreSQL — **separate from your dev database**. Setup
refuses to run if `.env.test` is missing or shares a `DATABASE_URL` with
`.env`, so the tests cannot pollute real data.

```bash
# 1. A throwaway Postgres (or point at a separate Neon/Supabase branch)
docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres --name los-test postgres:16

# 2. Configure it
cp apps/web/.env.test.example apps/web/.env.test   # then set DATABASE_URL

# 3. Install the browser once
pnpm --filter @lorofscrum/web exec playwright install --with-deps chromium

# 4. Run
pnpm test:e2e
```

Migrations and seeding run automatically before the suite. Useful extras:

| Command | Description |
|---------|-------------|
| `pnpm --filter @lorofscrum/web test:e2e:ui` | Interactive Playwright UI mode |
| `pnpm --filter @lorofscrum/web test:e2e:report` | Open the last HTML report |
| `pnpm --filter @lorofscrum/web exec playwright test --project=realtime` | Ably push tests (needs `ABLY_API_KEY`) |

The core suite is realtime-independent and passes without an Ably key.

## How It Works

1. **Create a Session** — Choose a name, pick an estimation scale, and enter your display name. You become the host.
2. **Share the Invite Code** — A unique 8-character code is generated. Share it with your team.
3. **Join & Vote** — Participants join with the code, pick their display name, and vote on stories.
4. **Reveal & Discuss** — The host reveals votes. If estimates diverge significantly, the tool flags it for discussion.
5. **Re-vote or Move On** — The host can reset a round for re-voting or start a new round.

All voting happens in real time via Ably — everyone sees updates instantly.

## Architecture

The application follows **Clean Architecture** principles:

- **Domain Layer** (`src/domain/`) — Pure business rules with zero framework dependencies
- **Application Layer** (`src/application/`) — Use cases orchestrate domain logic via ports
- **Infrastructure Layer** (`src/infrastructure/`) — Prisma repositories, Ably publisher, NextAuth config
- **API Layer** (`src/app/api/`) — Next.js Route Handlers that validate input and call use cases

See the full documentation in the [docs/](docs/) folder (12 files covering architecture, database, API design, frontend, business rules, infrastructure, CI/CD, observability, testing, delivery workflow, AI agent workflow, and backend design).

## Deployment

The app is designed for **Vercel** zero-cost deployment:

1. Connect the repo to Vercel
2. Set environment variables in the Vercel dashboard
3. Deploy — Vercel handles build, preview deploys, and production

A Vercel Cron job runs daily at 3 AM UTC to clean up sessions older than 72 hours.

## License

MIT
