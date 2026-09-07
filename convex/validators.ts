import { v } from "convex/values";

export const kind = v.union(
  v.literal("ENTRY"),
  v.literal("TRAINING"),
  v.literal("EXIT"),
);
export const level = v.union(
  v.literal("LOW"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
);
export const state = v.union(
  v.literal("IN_PROGRESS"),
  v.literal("SUBMITTED"),
  v.literal("EXPIRED"),
);
export const choice = v.object({ label: v.string(), text: v.string() });
export const category = v.object({
  name: v.string(),
  correct: v.number(),
  total: v.number(),
  level,
});
export const questionInput = v.object({
  key: v.string(),
  bank: v.string(),
  number: v.number(),
  prompt: v.string(),
  choices: v.array(choice),
  correct: v.string(),
  competency: v.string(),
  contentArea: v.string(),
  help1: v.string(),
  help2: v.string(),
});
export const questionView = v.object({
  id: v.id("questions"),
  number: v.number(),
  prompt: v.string(),
  choices: v.array(choice),
  competency: v.string(),
  contentArea: v.string(),
});
export const answerView = v.object({
  questionId: v.id("questions"),
  selected: v.string(),
  revision: v.number(),
  flagged: v.boolean(),
});
export const attemptView = v.object({
  id: v.id("attempts"),
  kind,
  state,
  startedAt: v.number(),
  deadlineAt: v.union(v.number(), v.null()),
  finishedAt: v.union(v.number(), v.null()),
  questionIds: v.array(v.id("questions")),
  score: v.union(v.number(), v.null()),
  correct: v.number(),
  answered: v.number(),
  categories: v.array(category),
});
export const profileView = v.object({
  name: v.string(),
  email: v.string(),
  program: v.string(),
  photo: v.union(v.string(), v.null()),
  onboarded: v.boolean(),
});
export const planView = v.object({
  code: v.string(),
  minimum: v.number(),
  total: v.number(),
  answered: v.number(),
  reason: v.string(),
});
export const aidView = v.object({
  text: v.union(v.string(), v.null()),
  state: v.string(),
  error: v.union(v.string(), v.null()),
});
