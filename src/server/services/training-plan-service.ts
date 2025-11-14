import { AttemptKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TrainingPlanSummary } from "@/types/dashboard";

async function resolvePlanQuestions(trainingPlanId: string) {
  return prisma.planQuestion.findMany({
    where: { trainingPlanId },
    select: { questionId: true },
  });
}

export async function getTrainingPlanSummary(userId: string, trainingPlanId: string): Promise<TrainingPlanSummary | null> {
  const trainingPlan = await prisma.trainingPlan.findUnique({
    where: { id: trainingPlanId, isActive: true },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      minRequiredToUnlockExit: true,
    },
  });

  if (!trainingPlan) {
    return null;
  }

  const planQuestions = await resolvePlanQuestions(trainingPlanId);
  const questionIds = planQuestions.map((pq) => pq.questionId);
  const totalQuestions = questionIds.length;

  const answered = questionIds.length
    ? await prisma.examResponse.findMany({
        where: {
          questionId: { in: questionIds },
          attempt: {
            userId,
            kind: AttemptKind.TRAINING,
            trainingPlanId,
          },
        },
        select: { questionId: true },
        distinct: ["questionId"],
      })
    : [];

  const answeredCount = answered.length;
  const remainingToUnlockExit = Math.max(trainingPlan.minRequiredToUnlockExit - answeredCount, 0);

  return {
    ...trainingPlan,
    totalQuestions,
    answeredCount,
    remainingToUnlockExit,
    unlockedExit: remainingToUnlockExit <= 0,
  };
}

export async function getLatestTrainingPlanSummaryForUser(userId: string) {
  const placement = await prisma.placement.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      trainingPlanId: true,
      trainingPlan: {
        select: {
          code: true,
          title: true,
        },
      },
    },
  });

  if (!placement) {
    return null;
  }

  const summary = await getTrainingPlanSummary(userId, placement.trainingPlanId);
  if (!summary) return null;

  return {
    placementId: placement.id,
    trainingPlan: summary,
  };
}
