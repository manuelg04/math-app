import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { category, choice, kind, state } from "./validators";

export default defineSchema({
  profiles: defineTable({
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    program: v.string(),
    onboarded: v.boolean(),
    photoId: v.optional(v.id("_storage")),
    activeAttemptId: v.optional(v.id("attempts")),
    placementPlanId: v.optional(v.id("plans")),
    placementReason: v.optional(v.string()),
    entryAttemptId: v.optional(v.id("attempts")),
    exitAttemptId: v.optional(v.id("attempts")),
    lastAiAt: v.optional(v.number()),
  }).index("by_authId", ["authId"]),
  catalogs: defineTable({
    version: v.string(),
    active: v.boolean(),
    entryCount: v.number(),
    trainingCount: v.number(),
  })
    .index("by_version", ["version"])
    .index("by_active", ["active"]),
  questions: defineTable({
    key: v.string(),
    version: v.string(),
    bank: v.string(),
    number: v.number(),
    prompt: v.string(),
    choices: v.array(choice),
    correct: v.string(),
    competency: v.string(),
    contentArea: v.string(),
    help1: v.string(),
    help2: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_version_bank_number", ["version", "bank", "number"]),
  plans: defineTable({
    version: v.string(),
    code: v.string(),
    minimum: v.number(),
    questionIds: v.array(v.id("questions")),
  }).index("by_version_code", ["version", "code"]),
  rules: defineTable({
    version: v.string(),
    levels: v.string(),
    planId: v.id("plans"),
    reason: v.string(),
  }).index("by_version_levels", ["version", "levels"]),
  attempts: defineTable({
    owner: v.id("profiles"),
    version: v.string(),
    kind,
    state,
    questionIds: v.array(v.id("questions")),
    planId: v.optional(v.id("plans")),
    startedAt: v.number(),
    deadlineAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    correct: v.number(),
    answered: v.number(),
    categories: v.array(category),
  })
    .index("by_owner", ["owner"])
    .index("by_owner_kind", ["owner", "kind"]),
  responses: defineTable({
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    selected: v.string(),
    revision: v.number(),
    flagged: v.boolean(),
    updatedAt: v.number(),
  }).index("by_attempt_question", ["attemptId", "questionId"]),
  progress: defineTable({
    owner: v.id("profiles"),
    planId: v.id("plans"),
    answeredIds: v.array(v.id("questions")),
  }).index("by_owner_plan", ["owner", "planId"]),
  aids: defineTable({
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    key: v.string(),
    state: v.string(),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_attempt_question_key", ["attemptId", "questionId", "key"]),
  assets: defineTable({ key: v.string(), storageId: v.id("_storage") }).index(
    "by_key",
    ["key"],
  ),
  uploads: defineTable({
    owner: v.id("profiles"),
    storageId: v.id("_storage"),
  }).index("by_owner_storage", ["owner", "storageId"]),
});
