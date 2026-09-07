# Convex release

## Targets

- Repository: manuelg04/math-app; migration branch `refactor/convex-rq-plus`.
- Vercel project: `rq-math-lasalle` in Manuel's account.
- Intended public alias: https://rq-math-lasalle.vercel.app.
- Production backend: https://neat-porcupine-628.convex.cloud.
- Development backend: https://gallant-cricket-31.convex.cloud.

The original La Salle Vercel project was inaccessible to the connected account and was not modified. Its production branch remains separate from this migration branch.

## Implementation

The old PostgreSQL/Prisma, custom JWT, and Vercel Blob runtime was replaced by Convex database/functions/storage plus Better Auth. Next.js was upgraded to 16.3.4 with React 19.2.8. The student interface was rebuilt for desktop and mobile, with scoped reactive queries and lazy-loaded mathematical rendering.

Assessment answers are authorized by owner and assigned-question membership. The client receives no answer key. Revision checks prevent stale-tab overwrites. Pending saves are visible and scoped by account and attempt in browser storage; successful server saves survive reload. The server owns deadlines, grading, placement, distinct training progress, and exit prerequisites. Finalization is idempotent.

Passwords use Better Auth's password hashing and session management. Authenticated password changes work; email recovery is intentionally unavailable because there is no email sender. Photo uploads validate type, magic bytes, size, authentication, and ownership before attachment.

## Verification completed before deployment

- TypeScript, ESLint, six backend/domain test scenarios, and production build passed.
- Dependency audit reported zero vulnerabilities after removing obsolete dependencies and replacing the legacy spreadsheet parser with Python standard-library parsing.
- Live development smoke test passed signup, token creation, onboarding, entry/save/submit, placement, training hints, distinct progress, exit unlock/submit, password change, and login.
- Browser checks confirmed login, dashboard, training start, answer persistence after reload, and a usable 390-pixel mobile dashboard.
- Both Convex deployments contain the versioned academic catalog: 185 questions, 7 plans, 27 rules, and 9 files.

## Limits and handover

This is an application and academic-content migration. Historical student accounts, password hashes, answers, and photos were unavailable from the former deployment and have not been moved. Importing those records requires access to the old PostgreSQL/Blob export and an explicit identity-matching strategy. Do not tell existing students that their prior account history has been copied.

The Better Auth React provider currently has an upstream type compatibility issue with security-patched Better Auth 1.6.x. A single boundary assertion in `src/app/providers.tsx` adapts the provider's exported client type; live session and password flows were checked. Runtime auth is not replaced or bypassed.

Vercel can be transferred to La Salle when the destination team is ready and Manuel has the required role in both teams. Convex project ownership, OpenAI credentials, and any future email sender must be handled separately. Deploy Convex before deploying frontend code that needs new functions. Existing catalog versions must be retained while referenced by attempts.
