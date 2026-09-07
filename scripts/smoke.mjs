import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
const origin = process.env.TEST_SITE_URL || "http://localhost:3100";
const suffix = crypto.randomBytes(5).toString("hex");
const email = `rq-test-${suffix}@example.invalid`;
const password = `RQ-test-${crypto.randomBytes(18).toString("base64url")}`;
let cookies = "";
async function auth(path, body) {
  const res = await fetch(`${origin}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookies,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie();
  if (set.length) cookies = set.map((x) => x.split(";")[0]).join("; ");
  const text = await res.text();
  assert.equal(res.status, 200, `${path}: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}
await auth("sign-up/email", { email, password, name: "RQ Test Student" });
const { token } = await auth("convex/token");
assert.ok(token);
const health = await (await fetch(`${origin}/api/health`)).json();
const client = new ConvexHttpClient(health.backend);
client.setAuth(token);
await client.mutation("profiles:complete", {
  name: "RQ Test Student",
  program: "INGENIERIA DE SOFTWARE PRESENCIAL",
});
assert.equal((await client.query("profiles:me", {})).onboarded, true);
const entry = await client.mutation("exams:start", { kind: "ENTRY" });
const session = await client.query("exams:session", { id: entry });
assert.equal(session.attempt.questionIds.length, 35);
const q = await client.query("exams:question", {
  id: entry,
  questionId: session.attempt.questionIds[0],
});
assert.equal("correct" in q, false);
await client.mutation("exams:answer", {
  id: entry,
  questionId: q.id,
  selected: "A",
  expectedRevision: 0,
  flagged: true,
});
assert.equal(
  (await client.query("exams:session", { id: entry })).answers.length,
  1,
);
await client.mutation("exams:submit", { id: entry });
const dashboard = await client.query("exams:dashboard", {});
assert.ok(dashboard.plan);
const training = await client.mutation("exams:start", { kind: "TRAINING" });
const practice = await client.query("exams:session", { id: training });
await client.mutation("aids:request", {
  id: training,
  questionId: practice.attempt.questionIds[0],
  key: "concept",
});
assert.equal(
  (
    await client.query("aids:status", {
      id: training,
      questionId: practice.attempt.questionIds[0],
      key: "concept",
    })
  ).state,
  "ready",
);
for (const questionId of practice.attempt.questionIds.slice(
  0,
  dashboard.plan.minimum,
))
  await client.mutation("exams:answer", {
    id: training,
    questionId,
    selected: "A",
    expectedRevision: 0,
    flagged: false,
  });
await client.mutation("exams:submit", { id: training });
assert.equal(
  (await client.query("exams:dashboard", {})).plan.answered,
  dashboard.plan.minimum,
);
const exit = await client.mutation("exams:start", { kind: "EXIT" });
await client.mutation("exams:submit", { id: exit });
await client.mutation("profiles:changePassword", {
  currentPassword: password,
  newPassword: password + "-new",
});
cookies = "";
await auth("sign-in/email", { email, password: password + "-new" });
fs.writeFileSync(
  "/tmp/rq-smoke-account.json",
  JSON.stringify({
    email,
    password: password + "-new",
    entry,
    training,
    exit,
    origin,
  }),
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    origin,
    backend: health.backend,
    passed: [
      "signup",
      "JWT session",
      "onboarding",
      "entry start/save/submit",
      "training placement",
      "help content",
      "distinct progress",
      "exit unlock/submit",
      "password change/login",
    ],
    testAccount: email,
  }),
);
