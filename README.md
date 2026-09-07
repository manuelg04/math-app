# RQ+

A Spanish-language quantitative reasoning learning app built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Convex. Better Auth runs inside Convex for email/password accounts. Convex owns assessment state, scoring, training placement, progress, scheduled deadlines, and file storage.

## Run locally

Use Node.js 22 and Python 3 (Python is only needed to rebuild the academic catalog).

```sh
npm ci
npx convex dev --configure existing --team manuelg9704-gmail-com --project rq-math-lasalle --dev-deployment cloud --once
npx convex env set SITE_URL http://localhost:3100
npm run dev
```

Set `BETTER_AUTH_SECRET` privately in the Convex development dashboard. The CLI writes the public Convex URLs and deployment selector to `.env.local`. Never commit authentication secrets or deployment keys.

## Verification

```sh
npm run verify
npm audit
node scripts/smoke.mjs
```

The smoke check requires the local app and populated development database. It creates a synthetic test account, exercises the complete student journey, and writes temporary test credentials to `/tmp/rq-smoke-account.json` with owner-only permissions. Set `TEST_SITE_URL` explicitly to test another deployment; doing so creates test data there.

## Academic catalog

```sh
npm run catalog:build
npm run catalog:import
npm run catalog:import -- --prod
```

The builder reads the bundled Markdown and Excel workbook using Python's standard XML/ZIP libraries. It validates 35 entry/exit questions, 150 training questions, seven plans, 27 unique placements, and referenced images. Generated content is versioned; existing attempts retain their original question IDs and plan. The importer uploads images to Convex Storage and only activates a complete catalog. Imports are repeatable.

See [catalog review](docs/CATALOG_REVIEW.md) for the source corrections and approved D/E placement decision.

## Deploy

The current Manuel-owned project is `rq-math-lasalle`, separate from the previous La Salle Vercel project. Production Convex is `neat-porcupine-628`; development is `gallant-cricket-31`.

```sh
npm run verify
npx convex deploy -y
vercel --prod --yes --scope manuelg9704-gmailcoms-projects
```

Vercel production needs `NEXT_PUBLIC_CONVEX_URL=https://neat-porcupine-628.convex.cloud` and `NEXT_PUBLIC_CONVEX_SITE_URL=https://neat-porcupine-628.convex.site`. Convex production needs `SITE_URL=https://rq-math-lasalle.vercel.app` and a private `BETTER_AUTH_SECRET`.

Deploy backend changes before their frontend consumers. Vercel Git deployment alone does not deploy Convex. Use the migration branch for this new project; the old project's `main` branch remains untouched.

## Available and deferred

Email/password registration and login, authenticated password changes, profile photos, assessments, guided training, progress, and results are implemented. Password recovery by email is intentionally unavailable until an email sender exists. No reset email is falsely reported as sent.

The optional AI example tutor uses the existing OpenAI provider from Convex actions. Add `OPENAI_API_KEY` in Convex to activate it; `OPENAI_MODEL` is optional. Standard written hints do not need an AI key. AI is training-only, rate limited, and does not receive account identifiers or assessment answers.

The academic content was imported. Existing students, passwords, attempts, and photos from the former PostgreSQL/Vercel Blob deployment have **not** been imported: credentials/access to that deployment were unavailable. The new environment starts with new accounts. `prisma/` and `scripts/legacy/` preserve the former schema/import sources as reference; they are not part of the runtime.

Vercel ownership can later be transferred to La Salle. Convex ownership and OpenAI credentials must be transferred or reconfigured separately. See [release notes](docs/RELEASE.md).
