export function GET() {
  return Response.json({
    application: "rq-plus",
    backend: process.env.NEXT_PUBLIC_CONVEX_URL,
    release: "convex-v1",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
}
