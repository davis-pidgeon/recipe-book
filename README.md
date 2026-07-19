# Recipe book

A personal, single-household recipe app: recipes, weekly meal planning, and
grocery lists. Built with Next.js, hosted on Vercel, data in Neon Postgres.
The whole app sits behind one shared household password.

See the design and plans in [`docs/superpowers/`](docs/superpowers/).

## Requirements

- Node.js 24 LTS
- A Neon Postgres database (or any Postgres) for `DATABASE_URL`

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Name             | What it is                                          |
| ---------------- | --------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string (Neon)                   |
| `APP_PASSWORD`   | The shared password used to log in                  |
| `SESSION_SECRET` | A long random string for signing the session cookie |

Generate a session secret with `openssl rand -hex 32`. `.env` is gitignored; in
production these are set in the Vercel project's environment variables.

## Local development

```bash
npm install
npx prisma migrate dev      # apply database migrations
npm run dev                 # start the dev server at http://localhost:3000
```

## Tests

```bash
npm run test                # Vitest unit tests (lib/)
npm run e2e                 # Playwright end-to-end tests
```

## Deployment

Pushes to the `main` branch auto-deploy to Vercel. Ensure `DATABASE_URL`,
`APP_PASSWORD`, and `SESSION_SECRET` are set in the Vercel project settings.

## Illustrations

Uploaded art lives in `public/illustrations/`. The welcome screen shows
`welcome-hero.png` if present, otherwise a placeholder.
