import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { profile, ownedAttempt, writable, member, viewAttempt } from "./access";
import {
  kind,
  attemptView,
  answerView,
  questionView,
  planView,
} from "./validators";
import { resolveMedia } from "./media";
import { grade, nextRevision } from "./domain";

async function finish(ctx: MutationCtx, a: Doc<"attempts">, expired = false) {
  if (a.state !== "IN_PROGRESS") return a._id;
  const docs = await Promise.all(a.questionIds.map((id) => ctx.db.get(id)));
  if (docs.some((q) => !q))
    throw new ConvexError("El catálogo de esta evaluación está incompleto.");
  const answers = await ctx.db
    .query("responses")
    .withIndex("by_attempt_question", (q) => q.eq("attemptId", a._id))
    .take(200);
  const result = grade(
    docs.map((q) => ({ id: q!._id, number: q!.number, correct: q!.correct })),
    answers,
    a.kind !== "TRAINING",
  );
  if (a.kind === "ENTRY") {
    const levels = result.categories.map((c) => c.level).join(":");
    const rule = await ctx.db
      .query("rules")
      .withIndex("by_version_levels", (q) =>
        q.eq("version", a.version).eq("levels", levels),
      )
      .unique();
    if (!rule)
      throw new ConvexError(
        "Esta combinación requiere revisión académica. Tus respuestas están guardadas.",
      );
    await ctx.db.patch(a.owner, {
      placementPlanId: rule.planId,
      placementReason: rule.reason,
    });
  }
  await ctx.db.patch(a._id, {
    ...result,
    state: expired ? "EXPIRED" : "SUBMITTED",
    finishedAt: Date.now(),
  });
  const p = await ctx.db.get(a.owner);
  if (p?.activeAttemptId === a._id)
    await ctx.db.patch(p._id, { activeAttemptId: undefined });
  return a._id;
}

export const dashboard = query({
  args: {},
  returns: v.object({
    active: v.union(attemptView, v.null()),
    entry: v.union(attemptView, v.null()),
    exit: v.union(attemptView, v.null()),
    plan: v.union(planView, v.null()),
    recent: v.array(attemptView),
    catalogReady: v.boolean(),
  }),
  handler: async (ctx) => {
    const p = await profile(ctx);
    const [active, entry, exit, plan, recent, catalog] = await Promise.all([
      p.activeAttemptId ? ctx.db.get(p.activeAttemptId) : null,
      p.entryAttemptId ? ctx.db.get(p.entryAttemptId) : null,
      p.exitAttemptId ? ctx.db.get(p.exitAttemptId) : null,
      p.placementPlanId ? ctx.db.get(p.placementPlanId) : null,
      ctx.db
        .query("attempts")
        .withIndex("by_owner", (q) => q.eq("owner", p._id))
        .order("desc")
        .take(8),
      ctx.db
        .query("catalogs")
        .withIndex("by_active", (q) => q.eq("active", true))
        .unique(),
    ]);
    const progress = plan
      ? await ctx.db
          .query("progress")
          .withIndex("by_owner_plan", (q) =>
            q.eq("owner", p._id).eq("planId", plan._id),
          )
          .unique()
      : null;
    return {
      active: active?.state === "IN_PROGRESS" ? viewAttempt(active) : null,
      entry: entry ? viewAttempt(entry) : null,
      exit: exit ? viewAttempt(exit) : null,
      plan: plan
        ? {
            code: plan.code,
            minimum: plan.minimum,
            total: plan.questionIds.length,
            answered: progress?.answeredIds.length ?? 0,
            reason: p.placementReason ?? "",
          }
        : null,
      recent: recent.map(viewAttempt),
      catalogReady: !!catalog,
    };
  },
});

export const start = mutation({
  args: { kind },
  returns: v.id("attempts"),
  handler: async (ctx, { kind }) => {
    const p = await profile(ctx);
    if (!p.onboarded) throw new ConvexError("Completa tu perfil.");
    if (p.activeAttemptId) {
      const active = await ctx.db.get(p.activeAttemptId);
      if (active?.state === "IN_PROGRESS") {
        if (active.deadlineAt && Date.now() >= active.deadlineAt)
          await finish(ctx, active, true);
        else {
          if (active.kind === kind) return active._id;
          throw new ConvexError("Continúa o finaliza tu evaluación en curso.");
        }
      }
    }
    const fresh = await ctx.db.get(p._id);
    if (kind === "ENTRY" && fresh?.entryAttemptId)
      throw new ConvexError("Ya realizaste la prueba de entrada.");
    if (kind === "EXIT" && fresh?.exitAttemptId)
      throw new ConvexError("Ya realizaste la prueba de salida.");
    const catalog = await ctx.db
      .query("catalogs")
      .withIndex("by_active", (q) => q.eq("active", true))
      .unique();
    if (!catalog) throw new ConvexError("El catálogo aún no está disponible.");
    const plan = fresh?.placementPlanId
      ? await ctx.db.get(fresh.placementPlanId)
      : null;
    if (kind !== "ENTRY" && !plan)
      throw new ConvexError("Primero completa la prueba de entrada.");
    if (kind === "EXIT" && plan) {
      const progress = await ctx.db
        .query("progress")
        .withIndex("by_owner_plan", (q) =>
          q.eq("owner", p._id).eq("planId", plan._id),
        )
        .unique();
      if ((progress?.answeredIds.length ?? 0) < plan.minimum)
        throw new ConvexError("Completa el mínimo de preguntas de tu plan.");
    }
    const version = plan?.version ?? catalog.version;
    const ids =
      kind === "TRAINING"
        ? plan!.questionIds
        : (
            await ctx.db
              .query("questions")
              .withIndex("by_version_bank_number", (q) =>
                q.eq("version", version).eq("bank", "entry"),
              )
              .take(36)
          ).map((q) => q._id);
    if (!ids.length || (kind !== "TRAINING" && ids.length !== 35))
      throw new ConvexError("Catálogo incompleto.");
    const startedAt = Date.now();
    const deadlineAt =
      kind === "TRAINING" ? undefined : startedAt + 60 * 60 * 1000;
    const id = await ctx.db.insert("attempts", {
      owner: p._id,
      version,
      kind,
      state: "IN_PROGRESS",
      questionIds: ids,
      planId: plan?._id,
      startedAt,
      deadlineAt,
      correct: 0,
      answered: 0,
      categories: [],
    });
    await ctx.db.patch(p._id, {
      activeAttemptId: id,
      ...(kind === "ENTRY"
        ? { entryAttemptId: id }
        : kind === "EXIT"
          ? { exitAttemptId: id }
          : {}),
    });
    if (deadlineAt)
      await ctx.scheduler.runAt(deadlineAt, internal.exams.expire, { id });
    return id;
  },
});

export const session = query({
  args: { id: v.id("attempts") },
  returns: v.object({
    attempt: attemptView,
    answers: v.array(answerView),
    serverTime: v.number(),
  }),
  handler: async (ctx, { id }) => {
    const { attempt } = await ownedAttempt(ctx, id);
    const answers = await ctx.db
      .query("responses")
      .withIndex("by_attempt_question", (q) => q.eq("attemptId", id))
      .take(200);
    return {
      attempt: viewAttempt(attempt),
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selected: a.selected,
        revision: a.revision,
        flagged: a.flagged,
      })),
      serverTime: Date.now(),
    };
  },
});
export const question = query({
  args: { id: v.id("attempts"), questionId: v.id("questions") },
  returns: questionView,
  handler: async (ctx, { id, questionId }) => {
    const { attempt } = await ownedAttempt(ctx, id);
    member(attempt, questionId);
    const q = await ctx.db.get(questionId);
    if (!q) throw new ConvexError("Pregunta no disponible.");
    return {
      id: q._id,
      number: q.number,
      prompt: await resolveMedia(ctx, q.prompt),
      choices: await Promise.all(
        q.choices.map(async (c) => ({
          ...c,
          text: await resolveMedia(ctx, c.text),
        })),
      ),
      competency: q.competency,
      contentArea: q.contentArea,
    };
  },
});
export const answer = mutation({
  args: {
    id: v.id("attempts"),
    questionId: v.id("questions"),
    selected: v.string(),
    expectedRevision: v.number(),
    flagged: v.boolean(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { user, attempt } = await ownedAttempt(ctx, args.id);
    writable(attempt);
    member(attempt, args.questionId);
    const q = await ctx.db.get(args.questionId);
    if (!q || !q.choices.some((c) => c.label === args.selected))
      throw new ConvexError("Selecciona una opción válida.");
    const prior = await ctx.db
      .query("responses")
      .withIndex("by_attempt_question", (q) =>
        q.eq("attemptId", args.id).eq("questionId", args.questionId),
      )
      .unique();
    if (!nextRevision(prior?.revision, args.expectedRevision))
      throw new ConvexError(
        "La respuesta cambió en otra pestaña. Actualiza antes de continuar.",
      );
    const revision = (prior?.revision ?? 0) + 1;
    const data = {
      selected: args.selected,
      revision,
      flagged: args.flagged,
      updatedAt: Date.now(),
    };
    if (prior) await ctx.db.patch(prior._id, data);
    else {
      await ctx.db.insert("responses", {
        attemptId: args.id,
        questionId: args.questionId,
        ...data,
      });
      await ctx.db.patch(attempt._id, { answered: attempt.answered + 1 });
    }
    if (attempt.kind === "TRAINING" && attempt.planId) {
      const progress = await ctx.db
        .query("progress")
        .withIndex("by_owner_plan", (q) =>
          q.eq("owner", user._id).eq("planId", attempt.planId!),
        )
        .unique();
      if (!progress)
        await ctx.db.insert("progress", {
          owner: user._id,
          planId: attempt.planId,
          answeredIds: [args.questionId],
        });
      else if (!progress.answeredIds.includes(args.questionId))
        await ctx.db.patch(progress._id, {
          answeredIds: [...progress.answeredIds, args.questionId],
        });
    }
    return revision;
  },
});
export const submit = mutation({
  args: { id: v.id("attempts") },
  returns: v.id("attempts"),
  handler: async (ctx, { id }) => {
    const { attempt } = await ownedAttempt(ctx, id);
    return finish(
      ctx,
      attempt,
      !!attempt.deadlineAt && Date.now() >= attempt.deadlineAt,
    );
  },
});
export const expire = internalMutation({
  args: { id: v.id("attempts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const a = await ctx.db.get(id);
    if (
      a?.state === "IN_PROGRESS" &&
      a.deadlineAt &&
      Date.now() >= a.deadlineAt
    )
      await finish(ctx, a, true);
    return null;
  },
});
