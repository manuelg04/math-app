import { prisma } from "@/lib/prisma";
import { AttemptKind, AttemptStatus, Level, Prisma } from "@prisma/client";

type StartAttemptFailureCode =
  | "ENTRY_ALREADY_COMPLETED"
  | "TRAINING_REQUIRES_PLACEMENT"
  | "EXIT_REQUIRES_PLACEMENT"
  | "EXIT_LOCKED"
  | "EXIT_ALREADY_COMPLETED"
  | "TRAINING_PLAN_INACTIVE";

type StartExamAttemptResult =
  | {
      success: true;
      attempt: {
        id: string;
        startedAt: Date;
        status: AttemptStatus;
        kind: AttemptKind;
        trainingPlanId: string | null;
      };
    }
  | {
      success: false;
      error: string;
      code?: StartAttemptFailureCode;
    };

const attemptSelect = {
  id: true,
  startedAt: true,
  status: true,
  kind: true,
  trainingPlanId: true,
} as const;

async function getTrainingProgress(userId: string, trainingPlanId: string) {
  const trainingPlan = await prisma.trainingPlan.findUnique({
    where: { id: trainingPlanId, isActive: true },
    select: {
      id: true,
      minRequiredToUnlockExit: true,
      planQuestions: {
        select: { questionId: true },
      },
    },
  });

  if (!trainingPlan) {
    return null;
  }

  const questionIds = trainingPlan.planQuestions.map((pq) => pq.questionId);

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
  const minRequired = trainingPlan.minRequiredToUnlockExit;
  const remaining = Math.max(minRequired - answeredCount, 0);

  return {
    answeredCount,
    minRequired,
    remaining,
    unlocked: remaining <= 0,
  };
}

function resolveCategoryLevel(
  thresholds: Array<{
    level: Level;
    minPointsInclusive: number;
    maxPointsInclusive: number | null;
  }>,
  rawPoints: number
): Level {
  if (thresholds.length === 0) {
    return Level.LOW;
  }

  const sorted = [...thresholds].sort(
    (a, b) => a.minPointsInclusive - b.minPointsInclusive
  );

  for (const threshold of sorted) {
    const max = threshold.maxPointsInclusive ?? Number.POSITIVE_INFINITY;
    if (rawPoints >= threshold.minPointsInclusive && rawPoints <= max) {
      return threshold.level;
    }
  }

  if (rawPoints < sorted[0].minPointsInclusive) {
    return sorted[0].level;
  }

  return sorted[sorted.length - 1].level;
}

async function processEntrySubmission(
  tx: Prisma.TransactionClient,
  params: {
    attemptId: string;
    examId: string;
    userId: string;
    responses: Array<{ questionId: string; isCorrect: boolean | null }>;
    questions: Array<{ id: string; orderIndex: number | null }>;
  }
) {
  const questionOrderMap = new Map<string, number>();
  for (const question of params.questions) {
    questionOrderMap.set(question.id, question.orderIndex ?? 0);
  }

  const categoryDefinitions = await tx.entryCategoryDefinition.findMany({
    where: { examId: params.examId },
    select: {
      id: true,
      key: true,
      orderStart: true,
      orderEnd: true,
      thresholds: {
        select: {
          level: true,
          minPointsInclusive: true,
          maxPointsInclusive: true,
        },
      },
    },
  });

  if (categoryDefinitions.length === 0) {
    console.warn(
      "[processEntrySubmission] No se encontraron definiciones de categoría para el examen",
      { examId: params.examId }
    );
    return null;
  }

  const levelByKey: Record<string, Level> = {};

  for (const definition of categoryDefinitions) {
    const rawPoints = params.responses.filter((response) => {
      if (response.isCorrect !== true) return false;
      const orderIndex = questionOrderMap.get(response.questionId);
      if (orderIndex === undefined) return false;
      return orderIndex >= definition.orderStart && orderIndex <= definition.orderEnd;
    }).length;

    const level = resolveCategoryLevel(definition.thresholds, rawPoints);
    levelByKey[definition.key] = level;

    await tx.entryCategoryScore.upsert({
      where: {
        attemptId_categoryDefinitionId: {
          attemptId: params.attemptId,
          categoryDefinitionId: definition.id,
        },
      },
      update: {
        rawPoints,
        level,
      },
      create: {
        attemptId: params.attemptId,
        categoryDefinitionId: definition.id,
        rawPoints,
        level,
      },
    });
  }

  const interpLevel = levelByKey["INTERPRETACION"];
  const formLevel = levelByKey["FORMULACION"];
  const arguLevel = levelByKey["ARGUMENTACION"];

  if (!interpLevel || !formLevel || !arguLevel) {
    throw new Error("No se pudieron determinar los niveles para todas las categorías requeridas");
  }

  const placementRule = await tx.placementRule.findUnique({
    where: {
      examId_interpLevel_formLevel_arguLevel: {
        examId: params.examId,
        interpLevel,
        formLevel,
        arguLevel,
      },
    },
    select: {
      id: true,
      trainingPlanId: true,
    },
  });

  if (!placementRule) {
    throw new Error(
      `No se encontró una regla de colocación para la combinación ${interpLevel}-${formLevel}-${arguLevel}`
    );
  }

  const placementData = {
    userId: params.userId,
    entryAttemptId: params.attemptId,
    trainingPlanId: placementRule.trainingPlanId,
    interpLevel,
    formLevel,
    arguLevel,
  } as const;

  const existingPlacement = await tx.placement.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingPlacement) {
    await tx.placement.update({
      where: { id: existingPlacement.id },
      data: placementData,
    });
  } else {
    await tx.placement.create({ data: placementData });
  }

  return placementData;
}

export async function startExamAttempt(
  userId: string,
  examId: string,
  attemptKind: AttemptKind = AttemptKind.GENERIC
): Promise<StartExamAttemptResult> {
  if (attemptKind === AttemptKind.ENTRY) {
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { userId, examId, kind: AttemptKind.ENTRY },
      orderBy: { startedAt: "desc" },
      select: attemptSelect,
    });

    if (existingAttempt) {
      if (existingAttempt.status === AttemptStatus.IN_PROGRESS) {
        return { success: true, attempt: existingAttempt };
      }
      return {
        success: false,
        error: "Ya completaste la prueba de entrada",
        code: "ENTRY_ALREADY_COMPLETED",
      };
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        status: AttemptStatus.IN_PROGRESS,
        kind: AttemptKind.ENTRY,
      },
      select: attemptSelect,
    });
    return { success: true, attempt };
  }

  if (attemptKind === AttemptKind.TRAINING) {
    const placement = await prisma.placement.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { trainingPlanId: true },
    });

    if (!placement) {
      return {
        success: false,
        error: "Necesitas un plan asignado para iniciar el entrenamiento",
        code: "TRAINING_REQUIRES_PLACEMENT",
      };
    }

    const trainingPlan = await prisma.trainingPlan.findUnique({
      where: { id: placement.trainingPlanId, isActive: true },
      select: { id: true },
    });

    if (!trainingPlan) {
      return {
        success: false,
        error: "Tu plan de entrenamiento no está activo",
        code: "TRAINING_PLAN_INACTIVE",
      };
    }

    const existingAttempt = await prisma.examAttempt.findFirst({
      where: {
        userId,
        examId,
        kind: AttemptKind.TRAINING,
        status: AttemptStatus.IN_PROGRESS,
        trainingPlanId: trainingPlan.id,
      },
      orderBy: { startedAt: "desc" },
      select: attemptSelect,
    });

    if (existingAttempt) {
      return { success: true, attempt: existingAttempt };
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        status: AttemptStatus.IN_PROGRESS,
        kind: AttemptKind.TRAINING,
        trainingPlanId: trainingPlan.id,
      },
      select: attemptSelect,
    });
    return { success: true, attempt };
  }

  if (attemptKind === AttemptKind.EXIT) {
    const placement = await prisma.placement.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { trainingPlanId: true },
    });

    if (!placement) {
      return {
        success: false,
        error: "Necesitas un plan asignado para presentar la prueba de salida",
        code: "EXIT_REQUIRES_PLACEMENT",
      };
    }

    const progress = await getTrainingProgress(userId, placement.trainingPlanId);
    if (!progress) {
      return {
        success: false,
        error: "Tu plan de entrenamiento no está activo",
        code: "TRAINING_PLAN_INACTIVE",
      };
    }

    if (!progress.unlocked) {
      return {
        success: false,
        error: `Aún te faltan ${progress.remaining} preguntas respondidas para desbloquear la prueba de salida`,
        code: "EXIT_LOCKED",
      };
    }

    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { userId, examId, kind: AttemptKind.EXIT },
      orderBy: { startedAt: "desc" },
      select: attemptSelect,
    });

    if (existingAttempt) {
      if (existingAttempt.status === AttemptStatus.IN_PROGRESS) {
        return { success: true, attempt: existingAttempt };
      }
      return {
        success: false,
        error: "Ya completaste la prueba de salida",
        code: "EXIT_ALREADY_COMPLETED",
      };
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        status: AttemptStatus.IN_PROGRESS,
        kind: AttemptKind.EXIT,
        trainingPlanId: placement.trainingPlanId,
      },
      select: attemptSelect,
    });
    return { success: true, attempt };
  }

  // Fallback (GENERIC u otros usos futuros)
  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      examId,
      status: AttemptStatus.IN_PROGRESS,
      kind: attemptKind,
    },
    select: attemptSelect,
  });
  return { success: true, attempt };
}

export async function getExamAttemptById(attemptId: string, userId: string) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      examId: true,
      startedAt: true,
      submittedAt: true,
      timeSpent: true,
      score: true,
      status: true,
      kind: true,
      trainingPlanId: true,
      trainingPlan: {
        select: {
          id: true,
          code: true,
          title: true,
          _count: {
            select: {
              planQuestions: true,
            },
          },
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          questions: {
            select: { id: true, orderIndex: true },
          },
        },
      },
      responses: {
        select: {
          id: true,
          questionId: true,
          selectedOptionId: true,
          isCorrect: true,
        },
      },
    },
  });

  if (!attempt) return { success: false, error: "Intento no encontrado" };
  return { success: true, attempt };
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string,
  userId: string
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: AttemptStatus.IN_PROGRESS },
  });
  if (!attempt) return { success: false, error: "Intento no válido" };

  const option = await prisma.option.findUnique({
    where: { id: selectedOptionId },
    select: { isCorrect: true, questionId: true },
  });
  if (!option || option.questionId !== questionId) {
    return { success: false, error: "Opción no válida" };
  }

  const response = await prisma.examResponse.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedOptionId, isCorrect: option.isCorrect },
    update: { selectedOptionId, isCorrect: option.isCorrect, answeredAt: new Date() },
    select: { id: true, questionId: true, selectedOptionId: true, isCorrect: true },
  });

  return { success: true, response };
}

export async function submitExamAttempt(attemptId: string, userId: string, timeSpent: number) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      console.log("[submitExamAttempt] Buscando intento:", { attemptId, userId });

      const attempt = await tx.examAttempt.findFirst({
        where: { id: attemptId, userId, status: AttemptStatus.IN_PROGRESS },
        select: {
          id: true,
          examId: true,
          userId: true,
          kind: true,
          responses: {
            select: {
              questionId: true,
              isCorrect: true,
            },
          },
          exam: {
            select: {
              id: true,
              questions: {
                select: {
                  id: true,
                  orderIndex: true,
                },
              },
            },
          },
        },
      });

      if (!attempt) {
        console.error("[submitExamAttempt] Intento no encontrado o ya submitido");
        return { success: false, error: "Intento no válido" } as const;
      }

      console.log("[submitExamAttempt] Intento encontrado:", {
        id: attempt.id,
        kind: attempt.kind,
        responsesCount: attempt.responses.length,
        questionsCount: attempt.exam.questions.length,
      });

      const totalQuestions = attempt.exam.questions.length;
      const correctAnswers = attempt.responses.filter((r) => r.isCorrect === true).length;
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      console.log("[submitExamAttempt] Calculando score:", { totalQuestions, correctAnswers, score });

      const updatedAttempt = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          timeSpent,
          score,
        },
        select: { id: true, submittedAt: true, timeSpent: true, score: true, status: true },
      });

      let placement = null as Awaited<ReturnType<typeof processEntrySubmission>>;
      if (attempt.kind === AttemptKind.ENTRY) {
        placement = await processEntrySubmission(tx, {
          attemptId: attempt.id,
          examId: attempt.examId,
          userId: attempt.userId,
          responses: attempt.responses,
          questions: attempt.exam.questions,
        });
      }

      console.log("[submitExamAttempt] Intento actualizado exitosamente");

      return {
        success: true as const,
        attempt: updatedAttempt,
        details: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers: totalQuestions - correctAnswers,
        },
        placement,
      };
    });

    return result;
  } catch (error) {
    console.error("[submitExamAttempt] Error crítico:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar el entrenamiento",
    };
  }
}

export async function logAidUsage(
  attemptId: string,
  questionId: string,
  aidKey: "AID1" | "AID2" | "AI_ASSIST",
  userId: string
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: AttemptStatus.IN_PROGRESS },
    select: { id: true },
  });
  if (!attempt) return { success: false, error: "Intento no válido" };

  const usage = await prisma.examAidUsage.upsert({
    where: {
      attemptId_questionId_aidKey: { attemptId, questionId, aidKey },
    },
    create: { attemptId, questionId, aidKey },
    update: {},
    select: { id: true, attemptId: true, questionId: true, aidKey: true, createdAt: true },
  });

  return { success: true, usage };
}
