import { ConvexError } from "convex/values";
import { authComponent } from "./auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canWrite } from "./domain";

export async function profile(ctx: QueryCtx | MutationCtx) {
  const auth = await authComponent.safeGetAuthUser(ctx);
  if (!auth) throw new ConvexError("Inicia sesión para continuar.");
  const user = await ctx.db
    .query("profiles")
    .withIndex("by_authId", (q) => q.eq("authId", auth._id))
    .unique();
  if (!user) throw new ConvexError("Completa tu perfil para continuar.");
  return user;
}
export async function ownedAttempt(
  ctx: QueryCtx | MutationCtx,
  id: Id<"attempts">,
) {
  const user = await profile(ctx);
  const attempt = await ctx.db.get(id);
  if (!attempt || attempt.owner !== user._id)
    throw new ConvexError("No se encontró esta evaluación.");
  return { user, attempt };
}
export function writable(attempt: Doc<"attempts">) {
  if (!canWrite(attempt.state, attempt.deadlineAt, Date.now()))
    throw new ConvexError(
      "La evaluación finalizó. Actualiza para ver tus resultados.",
    );
}
export function member(attempt: Doc<"attempts">, questionId: Id<"questions">) {
  if (!attempt.questionIds.includes(questionId))
    throw new ConvexError("La pregunta no pertenece a esta evaluación.");
}
export function viewAttempt(a: Doc<"attempts">) {
  return {
    id: a._id,
    kind: a.kind,
    state: a.state,
    startedAt: a.startedAt,
    deadlineAt: a.deadlineAt ?? null,
    finishedAt: a.finishedAt ?? null,
    questionIds: a.questionIds,
    score: a.score ?? null,
    correct: a.correct,
    answered: a.answered,
    categories: a.categories,
  };
}
