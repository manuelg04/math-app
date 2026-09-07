# RQ+ engineering

Use Node.js 22. Run `npm run verify` for type checking, lint, domain/backend tests, and a production build. Run `npm audit` after dependency changes. Use `npm run dev` on port 3100 for browser verification.

Keep application data and authorization in `convex/`. Every public query, mutation, and action must validate authentication and resource ownership. Never expose answer keys or assessment hints before submission. Use indexes and bounded reads. Internal catalog functions must remain internal. Existing catalog versions are immutable for active attempts.

The frontend uses Next.js App Router and focused React components. Use Convex reactive hooks for application data and Better Auth for classic email/password authentication. Heavy mathematical rendering belongs in the lazy-loaded question view. Preserve Spanish student-facing copy, accessible controls, explicit save failures, and server-owned deadlines.

Do not add code comments or mention Codex as a commit coauthor. Preserve unrelated user changes. Explain completion using evidence, distinguishing local tests, backend deployment, Vercel readiness, and public live checks.

The former PostgreSQL schema and importer scripts are archival references. Never run them against production as part of this Convex app. Read README.md and docs/RELEASE.md before deployment. The new Vercel project belongs to Manuel; do not modify the old La Salle project or push main incidentally.

Read the relevant version-matched Next.js guides in `node_modules/next/dist/docs/` before changing framework behavior.
