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

- TypeScript, ESLint, seven backend/domain/rendering test scenarios, and production build passed.
- Dependency audit reported zero vulnerabilities after removing obsolete dependencies and replacing the legacy spreadsheet parser with Python standard-library parsing.
- Live development smoke test passed signup, token creation, onboarding, entry/save/submit, placement, training hints, distinct progress, exit unlock/submit, password change, and login.
- Browser checks confirmed login, dashboard, training start, answer persistence after reload, and a usable 390-pixel mobile dashboard.
- Both Convex deployments contain the versioned academic catalog: 185 questions, 7 plans, 27 rules, and 9 files.

## Limits and handover

This is an application and academic-content migration. Historical student accounts, password hashes, answers, and photos were unavailable from the former deployment and have not been moved. Importing those records requires access to the old PostgreSQL/Blob export and an explicit identity-matching strategy. Do not tell existing students that their prior account history has been copied.

The Better Auth React provider currently has an upstream type compatibility issue with security-patched Better Auth 1.6.x. A single boundary assertion in `src/app/providers.tsx` adapts the provider's exported client type; live session and password flows were checked. Runtime auth is not replaced or bypassed.

Vercel can be transferred to La Salle when the destination team is ready and Manuel has the required role in both teams. Convex project ownership, OpenAI credentials, and any future email sender must be handled separately. Deploy Convex before deploying frontend code that needs new functions. Existing catalog versions must be retained while referenced by attempts.

## Public production verification

The public alias responds with HTTP 200 and reports `neat-porcupine-628.convex.cloud` as its backend. A production test account completed registration, onboarding, profile-photo upload and retrieval, entry assessment, training placement, regular hints, AI example generation, distinct-question progress, exit assessment, and password change/login. Invalid image content was rejected. Password recovery remains unavailable as agreed.

The public landing page was inspected in the browser. Vercel branch tracking now points to `refactor/convex-rq-plus`, and its runtime is Node.js 22. Frontend Git deployments are automatic for that branch; Convex backend changes still require `npx convex deploy -y` before the frontend consumes them.

The repository's `vercel.json` requires `npm run verify` for frontend deployments: route type generation, TypeScript, ESLint, tests, then the production build. A failed check prevents that deployment from publishing.

Timed assessments show instructions before creating the attempt. The current question is remembered per account and attempt in the same browser when storage is available. Final review links lead directly to unanswered or flagged questions without submitting the attempt.

Currency rendering preserves literal Colombian peso amounts while retaining LaTeX formulas. The regression test covers multiple prices in a sentence, price tables, coin expressions, inline algebra, and display formulas.

A 390-pixel browser check confirmed that wide question and answer tables scroll inside their cards while the page itself stays within the viewport. Table headings and peso amounts remain unbroken. Production results and logout were also checked in the browser.
