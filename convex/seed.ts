import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { questionInput } from "./validators";

export const uploadUrl = internalMutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => ctx.storage.generateUploadUrl(),
});
export const getAsset = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.id("_storage"), v.null()),
  handler: async (ctx, { key }) =>
    (
      await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )?.storageId ?? null,
});
export const asset = internalMutation({
  args: { key: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const old = await ctx.db
      .query("assets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!old) await ctx.db.insert("assets", args);
    return null;
  },
});
export const questions = internalMutation({
  args: { version: v.string(), questions: v.array(questionInput) },
  returns: v.number(),
  handler: async (ctx, { version, questions }) => {
    if (questions.length > 20)
      throw new ConvexError("Use batches of at most 20 questions.");
    let inserted = 0;
    for (const q of questions) {
      const key = `${version}:${q.key}`;
      const prior = await ctx.db
        .query("questions")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (!prior) {
        await ctx.db.insert("questions", { ...q, key, version });
        inserted++;
      }
    }
    return inserted;
  },
});
export const configure = internalMutation({
  args: {
    version: v.string(),
    plans: v.array(
      v.object({
        code: v.string(),
        minimum: v.number(),
        questions: v.array(v.string()),
      }),
    ),
    rules: v.array(
      v.object({ levels: v.string(), plan: v.string(), reason: v.string() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { version, plans, rules }) => {
    const entry = await ctx.db
      .query("questions")
      .withIndex("by_version_bank_number", (q) =>
        q.eq("version", version).eq("bank", "entry"),
      )
      .take(36);
    const training = await ctx.db
      .query("questions")
      .withIndex("by_version_bank_number", (q) =>
        q.eq("version", version).eq("bank", "training"),
      )
      .take(151);
    if (
      entry.length !== 35 ||
      training.length !== 150 ||
      plans.length !== 7 ||
      new Set(rules.map((r) => r.levels)).size !== 27
    )
      throw new ConvexError("Incomplete catalog.");
    for (const p of plans) {
      const questionIds = [];
      for (const key of p.questions) {
        const q = await ctx.db
          .query("questions")
          .withIndex("by_key", (q) => q.eq("key", `${version}:${key}`))
          .unique();
        if (!q) throw new ConvexError(`Missing ${key}`);
        questionIds.push(q._id);
      }
      const old = await ctx.db
        .query("plans")
        .withIndex("by_version_code", (q) =>
          q.eq("version", version).eq("code", p.code),
        )
        .unique();
      if (!old)
        await ctx.db.insert("plans", {
          version,
          code: p.code,
          minimum: p.minimum,
          questionIds,
        });
    }
    for (const r of rules) {
      const plan = await ctx.db
        .query("plans")
        .withIndex("by_version_code", (q) =>
          q.eq("version", version).eq("code", r.plan),
        )
        .unique();
      if (!plan) throw new ConvexError("Missing plan.");
      const old = await ctx.db
        .query("rules")
        .withIndex("by_version_levels", (q) =>
          q.eq("version", version).eq("levels", r.levels),
        )
        .unique();
      if (!old)
        await ctx.db.insert("rules", {
          version,
          levels: r.levels,
          planId: plan._id,
          reason: r.reason,
        });
    }
    const prior = await ctx.db
      .query("catalogs")
      .withIndex("by_active", (q) => q.eq("active", true))
      .unique();
    if (prior && prior.version !== version)
      await ctx.db.patch(prior._id, { active: false });
    const same = await ctx.db
      .query("catalogs")
      .withIndex("by_version", (q) => q.eq("version", version))
      .unique();
    if (same) await ctx.db.patch(same._id, { active: true });
    else
      await ctx.db.insert("catalogs", {
        version,
        active: true,
        entryCount: 35,
        trainingCount: 150,
      });
    return null;
  },
});
export const verify = internalQuery({
  args: { version: v.string() },
  returns: v.object({
    questions: v.number(),
    plans: v.number(),
    rules: v.number(),
    assets: v.number(),
  }),
  handler: async (ctx, { version }) => ({
    questions: (
      await ctx.db
        .query("questions")
        .withIndex("by_version_bank_number", (q) => q.eq("version", version))
        .take(200)
    ).length,
    plans: (
      await ctx.db
        .query("plans")
        .withIndex("by_version_code", (q) => q.eq("version", version))
        .take(8)
    ).length,
    rules: (
      await ctx.db
        .query("rules")
        .withIndex("by_version_levels", (q) => q.eq("version", version))
        .take(28)
    ).length,
    assets: (await ctx.db.query("assets").take(200)).length,
  }),
});
