export function GET() {
  return Response.json({
    application: "rq-plus",
    backend: process.env.NEXT_PUBLIC_CONVEX_URL,
    release: "convex-v1",
  });
}
