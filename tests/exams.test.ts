import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import betterAuth from "@convex-dev/better-auth/test";
import schema from "../convex/schema";
import { api, internal, components } from "../convex/_generated/api";
import { grade, categoryLevel } from "../convex/domain";
import catalog from "../data/catalog/catalog.json";
const modules = import.meta.glob("../convex/**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  betterAuth.register(t);
  async function user(email: string) {
    const now = Date.now();
    const auth = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "Test Student",
          email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    const session = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: auth._id,
          token: email,
          expiresAt: now + 86400000,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    const client = t.withIdentity({
      subject: auth._id,
      sessionId: session._id,
    });
    await client.mutation(api.profiles.complete, {
      name: "Test Student",
      program: "INGENIERIA DE SOFTWARE PRESENCIAL",
    });
    return client;
  }
  for (let i = 0; i < catalog.questions.length; i += 20)
    await t.mutation(internal.seed.questions, {
      version: catalog.version,
      questions: catalog.questions.slice(i, i + 20) as Parameters<
        typeof t.mutation<typeof internal.seed.questions>
      >[1]["questions"],
    });
  await t.mutation(internal.seed.configure, {
    version: catalog.version,
    plans: catalog.plans,
    rules: catalog.rules,
  });
  return { t, user };
}
afterEach(() => vi.useRealTimers());
describe("assessment authorization and lifecycle", () => {
  it("rejects unauthenticated users, other owners, and unassigned questions", async () => {
    const { t, user } = await fixture();
    await expect(t.query(api.exams.dashboard, {})).rejects.toThrow(
      "Inicia sesión",
    );
    const alice = await user("alice@example.invalid");
    const bob = await user("bob@example.invalid");
    const id = await alice.mutation(api.exams.start, { kind: "ENTRY" });
    await expect(bob.query(api.exams.session, { id })).rejects.toThrow(
      "No se encontró",
    );
    const foreign = await t.run(
      async (ctx) =>
        (await ctx.db
          .query("questions")
          .withIndex("by_version_bank_number", (q) =>
            q.eq("version", catalog.version).eq("bank", "training"),
          )
          .first())!._id,
    );
    await expect(
      alice.mutation(api.exams.answer, {
        id,
        questionId: foreign,
        selected: "A",
        expectedRevision: 0,
        flagged: false,
      }),
    ).rejects.toThrow("no pertenece");
    const s = await alice.query(api.exams.session, { id });
    const q = await alice.query(api.exams.question, {
      id,
      questionId: s.attempt.questionIds[0],
    });
    expect(q).not.toHaveProperty("correct");
    await expect(
      alice.mutation(api.aids.request, { id, questionId: q.id, key: "steps" }),
    ).rejects.toThrow("solo para entrenamiento");
  });
  it("saves revisions, rejects stale writes, scores assigned questions, and submits once", async () => {
    const { user } = await fixture();
    const c = await user("revision@example.invalid");
    const id = await c.mutation(api.exams.start, { kind: "ENTRY" });
    expect(await c.mutation(api.exams.start, { kind: "ENTRY" })).toBe(id);
    const s = await c.query(api.exams.session, { id });
    const questionId = s.attempt.questionIds[0];
    await c.mutation(api.exams.answer, {
      id,
      questionId,
      selected: catalog.questions[0].correct,
      expectedRevision: 0,
      flagged: true,
    });
    await expect(
      c.mutation(api.exams.answer, {
        id,
        questionId,
        selected: "D",
        expectedRevision: 0,
        flagged: false,
      }),
    ).rejects.toThrow("otra pestaña");
    await c.mutation(api.exams.submit, { id });
    expect(await c.mutation(api.exams.submit, { id })).toBe(id);
    const result = await c.query(api.exams.session, { id });
    expect(result.attempt.correct).toBe(1);
    expect(result.attempt.score).toBeCloseTo(100 / 35);
    expect(result.attempt.state).toBe("SUBMITTED");
    await expect(
      c.mutation(api.exams.answer, {
        id,
        questionId,
        selected: "A",
        expectedRevision: 1,
        flagged: false,
      }),
    ).rejects.toThrow("finalizó");
    expect((await c.query(api.exams.dashboard, {})).plan?.code).toBe("A");
    await expect(
      c.mutation(api.exams.start, { kind: "ENTRY" }),
    ).rejects.toThrow("Ya realizaste");
  });
  it("enforces the server deadline and finalizes expired assessments", async () => {
    vi.useFakeTimers();
    const { t, user } = await fixture();
    const c = await user("deadline@example.invalid");
    const id = await c.mutation(api.exams.start, { kind: "ENTRY" });
    const s = await c.query(api.exams.session, { id });
    vi.setSystemTime(s.attempt.deadlineAt!);
    await expect(
      c.mutation(api.exams.answer, {
        id,
        questionId: s.attempt.questionIds[0],
        selected: "A",
        expectedRevision: 0,
        flagged: false,
      }),
    ).rejects.toThrow("finalizó");
    await t.mutation(internal.exams.expire, { id });
    expect((await c.query(api.exams.session, { id })).attempt.state).toBe(
      "EXPIRED",
    );
  });
  it("unlocks exit only after distinct training questions and uses the plan denominator", async () => {
    const { user } = await fixture();
    const c = await user("training@example.invalid");
    await expect(
      c.mutation(api.exams.start, { kind: "TRAINING" }),
    ).rejects.toThrow("prueba de entrada");
    const entry = await c.mutation(api.exams.start, { kind: "ENTRY" });
    await c.mutation(api.exams.submit, { id: entry });
    await expect(c.mutation(api.exams.start, { kind: "EXIT" })).rejects.toThrow(
      "mínimo",
    );
    const id = await c.mutation(api.exams.start, { kind: "TRAINING" });
    const s = await c.query(api.exams.session, { id });
    const minimum = (await c.query(api.exams.dashboard, {})).plan!.minimum;
    for (const questionId of s.attempt.questionIds.slice(0, minimum))
      await c.mutation(api.exams.answer, {
        id,
        questionId,
        selected: "A",
        expectedRevision: 0,
        flagged: false,
      });
    await c.mutation(api.exams.answer, {
      id,
      questionId: s.attempt.questionIds[0],
      selected: "B",
      expectedRevision: 1,
      flagged: false,
    });
    expect((await c.query(api.exams.dashboard, {})).plan?.answered).toBe(
      minimum,
    );
    await c.mutation(api.exams.submit, { id });
    const result = (await c.query(api.exams.session, { id })).attempt;
    expect(result.score).toBeCloseTo(
      (result.correct / result.questionIds.length) * 100,
    );
    expect(await c.mutation(api.exams.start, { kind: "EXIT" })).toBeTruthy();
  });
});
describe("catalog and scoring", () => {
  it("has complete plans, placements and immutable question banks", () => {
    expect(catalog.questions).toHaveLength(185);
    expect(new Set(catalog.rules.map((r) => r.levels)).size).toBe(27);
    expect(
      catalog.rules.find((r) => r.levels === "MEDIUM:LOW:HIGH")?.plan,
    ).toBe("D");
    expect(
      catalog.rules.find((r) => r.levels === "HIGH:MEDIUM:MEDIUM")?.plan,
    ).toBe("E");
    for (const q of catalog.questions) {
      expect(q.choices.map((c) => c.label)).toEqual(["A", "B", "C", "D"]);
      expect(q.choices.some((c) => c.label === q.correct)).toBe(true);
    }
  });
  it("counts blanks in the denominator and handles all category thresholds", () => {
    expect([0, 4, 5, 8, 9, 12].map(categoryLevel)).toEqual([
      "LOW",
      "LOW",
      "MEDIUM",
      "MEDIUM",
      "HIGH",
      "HIGH",
    ]);
    expect(
      grade(
        [
          { id: "a", number: 1, correct: "B" },
          { id: "b", number: 2, correct: "D" },
        ],
        [{ questionId: "a", selected: "B" }],
        false,
      ),
    ).toMatchObject({ score: 50, answered: 1, correct: 1 });
  });
});
