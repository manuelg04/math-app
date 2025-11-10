import { prisma } from "@/lib/prisma";
import { AttemptKind } from "@prisma/client";

export type ExamWithQuestions = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questions: Array<{
    id: string;
    orderIndex: number;
    code: string | null;
    prompt: string;
    competency: string | null;
    evidence: string | null;
    contentArea: string | null;
    context: string | null;
    help1Md: string | null;
    help2Md: string | null;
    choices: Array<{
      id: string;
      label: string;
      text: string;
      imageUrl: string | null;
    }>;
  }>;
};

type TrainingPlanContext = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  minRequiredToUnlockExit: number;
  totalQuestions: number;
  answeredCount: number;
  remainingToUnlockExit: number;
  unlockedExit: boolean;
};

type UserExamSuccess = {
  success: true;
  exam: ExamWithQuestions;
  context: {
    attemptKind: AttemptKind;
    trainingPlan?: TrainingPlanContext;
  };
};

type UserExamFailure = {
  success: false;
  error: string;
  code?:
    | "TRAINING_REQUIRES_PLACEMENT"
    | "EXIT_LOCKED"
    | "EXIT_REQUIRES_PLACEMENT"
    | "EXAM_NOT_FOUND";
  meta?: {
    trainingPlan?: TrainingPlanContext;
  };
};

export type UserExamResult = UserExamSuccess | UserExamFailure;

async function fetchExamWithQuestionsBySlug(slug: string): Promise<ExamWithQuestions | null> {
  const exam = await prisma.exam.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      durationMinutes: true,
      questions: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          code: true,
          prompt: true,
          competency: true,
          evidence: true,
          contentArea: true,
          context: true,
          help1Md: true,
          help2Md: true,
          choices: {
            select: {
              id: true,
              label: true,
              text: true,
              imageUrl: true,
            },
            orderBy: { label: "asc" },
          },
        },
      },
    },
  });

  if (!exam) {
    return null;
  }

  return exam as ExamWithQuestions;
}

async function getTrainingPlanContext(
  userId: string,
  trainingPlanId: string
): Promise<TrainingPlanContext | null> {
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

  const planQuestions = await prisma.planQuestion.findMany({
    where: { trainingPlanId },
    select: { questionId: true },
  });

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
  const remainingToUnlockExit = Math.max(
    trainingPlan.minRequiredToUnlockExit - answeredCount,
    0
  );

  return {
    ...trainingPlan,
    totalQuestions,
    answeredCount,
    remainingToUnlockExit,
    unlockedExit: answeredCount >= trainingPlan.minRequiredToUnlockExit,
  };
}

async function getTrainingExamQuestions(trainingPlanId: string): Promise<ExamWithQuestions["questions"]> {
  const planQuestions = await prisma.planQuestion.findMany({
    where: { trainingPlanId },
    orderBy: [
      { orderIndex: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      orderIndex: true,
      question: {
        select: {
          id: true,
          orderIndex: true,
          code: true,
          prompt: true,
          competency: true,
          evidence: true,
          contentArea: true,
          context: true,
          help1Md: true,
          help2Md: true,
          choices: {
            select: {
              id: true,
              label: true,
              text: true,
              imageUrl: true,
            },
            orderBy: { label: "asc" },
          },
        },
      },
    },
  });

  const sorted = planQuestions.sort((a, b) => {
    const aOrder = (a.orderIndex ?? a.question.orderIndex ?? 0);
    const bOrder = (b.orderIndex ?? b.question.orderIndex ?? 0);
    return aOrder - bOrder;
  });

  return sorted.map((pq) => {
    const question = pq.question;
    return {
      id: question.id,
      orderIndex: question.orderIndex,
      code: question.code,
      prompt: question.prompt,
      competency: question.competency,
      evidence: question.evidence,
      contentArea: question.contentArea,
      context: question.context,
      help1Md: question.help1Md,
      help2Md: question.help2Md,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        text: choice.text ?? "",
        imageUrl: choice.imageUrl,
      })),
    };
  });
}

export async function getExamForUser(
  userId: string,
  slug: string,
  attemptKind: AttemptKind
): Promise<UserExamResult> {
  const baseExam = await prisma.exam.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      durationMinutes: true,
    },
  });

  if (!baseExam) {
    return { success: false, error: "Examen no encontrado", code: "EXAM_NOT_FOUND" };
  }

  if (attemptKind === AttemptKind.TRAINING) {
    const placement = await prisma.placement.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        trainingPlanId: true,
      },
    });

    if (!placement) {
      return {
        success: false,
        error: "Necesitas completar la prueba de entrada para acceder al entrenamiento",
        code: "TRAINING_REQUIRES_PLACEMENT",
      };
    }

    const trainingPlanContext = await getTrainingPlanContext(userId, placement.trainingPlanId);
    if (!trainingPlanContext) {
      return {
        success: false,
        error: "Plan de entrenamiento no disponible",
        code: "TRAINING_REQUIRES_PLACEMENT",
      };
    }

    const questions = await getTrainingExamQuestions(placement.trainingPlanId);

    return {
      success: true,
      exam: {
        ...baseExam,
        questions,
      },
      context: {
        attemptKind,
        trainingPlan: trainingPlanContext,
      },
    };
  }

  const examWithQuestions = await fetchExamWithQuestionsBySlug(slug);
  if (!examWithQuestions) {
    return { success: false, error: "Examen no encontrado", code: "EXAM_NOT_FOUND" };
  }

  if (attemptKind === AttemptKind.EXIT) {
    const placement = await prisma.placement.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        trainingPlanId: true,
      },
    });

    if (!placement) {
      return {
        success: false,
        error: "Necesitas un plan asignado para presentar la prueba de salida",
        code: "EXIT_REQUIRES_PLACEMENT",
      };
    }

    const trainingPlanContext = await getTrainingPlanContext(userId, placement.trainingPlanId);
    if (!trainingPlanContext) {
      return {
        success: false,
        error: "Tu plan de entrenamiento no está disponible",
        code: "EXIT_REQUIRES_PLACEMENT",
      };
    }

    if (!trainingPlanContext.unlockedExit) {
      return {
        success: false,
        error: "Aún no cumples con el mínimo de preguntas respondidas para desbloquear la prueba de salida",
        code: "EXIT_LOCKED",
        meta: { trainingPlan: trainingPlanContext },
      };
    }

    return {
      success: true,
      exam: examWithQuestions,
      context: {
        attemptKind,
        trainingPlan: trainingPlanContext,
      },
    };
  }

  return {
    success: true,
    exam: examWithQuestions,
    context: { attemptKind },
  };
}

export async function getExamBySlug(
  slug: string
): Promise<{ success: true; exam: ExamWithQuestions } | { success: false; error: string }> {
  const exam = await fetchExamWithQuestionsBySlug(slug);

  if (!exam) {
    return { success: false, error: "Examen no encontrado" };
  }

  return { success: true, exam };
}

export async function getUserExamAttempts(userId: string, examId: string) {
  return prisma.examAttempt.findMany({
    where: { userId, examId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      timeSpent: true,
      score: true,
      status: true,
    },
  });
}

// (opcional) listado de exámenes activos
export async function listActiveExams() {
  return prisma.exam.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      version: true,
      isActive: true,
      createdAt: true,
    },
  });
}

// Verificar si el usuario tiene un examen activo diferente al especificado
export async function checkActiveExam(userId: string, excludeExamId?: string) {
  const activeAttempt = await prisma.examAttempt.findFirst({
    where: {
      userId,
      status: "IN_PROGRESS",
      ...(excludeExamId ? { examId: { not: excludeExamId } } : {}),
    },
    include: {
      exam: {
        select: {
          id: true,
          slug: true,
          title: true,
          durationMinutes: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  return activeAttempt;
}
