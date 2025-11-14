import { AttemptKind, AttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DashboardData } from "@/types/dashboard";
import { getTrainingPlanSummary } from "./training-plan-service";

export type DashboardServiceResult =
  | { status: "OK"; data: DashboardData }
  | { status: "NOT_FOUND" }
  | { status: "ONBOARDING_REQUIRED" };

export async function getDashboardData(userId: string): Promise<DashboardServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      role: true,
      createdAt: true,
      acceptedTos: true,
      onboardingComplete: true,
      fullName: true,
      academicProgram: true,
      profilePhoto: true,
    },
  });

  if (!user) {
    return { status: "NOT_FOUND" };
  }

  if (!user.onboardingComplete) {
    return { status: "ONBOARDING_REQUIRED" };
  }

  const exams = await prisma.exam.findMany({
    where: { slug: { in: ["saberpro_exam", "prueba_general"] } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      durationMinutes: true,
    },
  });

  const examBySlug = new Map(exams.map((exam) => [exam.slug, exam]));
  const entryExam = examBySlug.get("saberpro_exam") ?? null;
  const trainingExam = examBySlug.get("prueba_general") ?? null;

  const activeAttemptPromise = prisma.examAttempt.findFirst({
    where: { userId, status: AttemptStatus.IN_PROGRESS },
    select: {
      id: true,
      kind: true,
      exam: {
        select: { id: true, slug: true, title: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const entryAttemptPromise = entryExam
    ? prisma.examAttempt.findFirst({
        where: { userId, examId: entryExam.id, kind: AttemptKind.ENTRY },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const exitAttemptPromise = entryExam
    ? prisma.examAttempt.findFirst({
        where: { userId, examId: entryExam.id, kind: AttemptKind.EXIT },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const trainingAttemptPromise = trainingExam
    ? prisma.examAttempt.findFirst({
        where: {
          userId,
          examId: trainingExam.id,
          kind: AttemptKind.TRAINING,
          status: AttemptStatus.IN_PROGRESS,
        },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const placementPromise = prisma.placement.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      trainingPlanId: true,
      trainingPlan: {
        select: {
          code: true,
        },
      },
    },
  });

  const [
    activeAttempt,
    entryAttempt,
    exitAttempt,
    trainingAttempt,
    placement,
    entryQuestionCount,
  ] = await Promise.all([
    activeAttemptPromise,
    entryAttemptPromise,
    exitAttemptPromise,
    trainingAttemptPromise,
    placementPromise,
    entryExam
      ? prisma.question.count({ where: { examId: entryExam.id } })
      : Promise.resolve(0),
  ]);

  const trainingPlanSummary = placement
    ? await getTrainingPlanSummary(userId, placement.trainingPlanId)
    : null;

  const trainingQuestionCount =
    trainingPlanSummary?.totalQuestions ??
    (trainingExam
      ? await prisma.question.count({ where: { examId: trainingExam.id } })
      : 0);

  let entryStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";
  let entryAttemptId: string | null = null;
  if (entryAttempt) {
    entryAttemptId = entryAttempt.id;
    if (entryAttempt.status === AttemptStatus.IN_PROGRESS) {
      entryStatus = "IN_PROGRESS";
    } else if (entryAttempt.status === AttemptStatus.SUBMITTED) {
      entryStatus = "COMPLETED";
    }
  }

  let trainingStatus: "LOCKED" | "READY" | "IN_PROGRESS" = "LOCKED";
  let trainingAttemptId: string | null = null;
  if (trainingPlanSummary) {
    if (trainingAttempt && trainingAttempt.status === AttemptStatus.IN_PROGRESS) {
      trainingStatus = "IN_PROGRESS";
      trainingAttemptId = trainingAttempt.id;
    } else {
      trainingStatus = "READY";
    }
  }

  let exitStatus: "LOCKED" | "READY" | "IN_PROGRESS" | "COMPLETED" = "LOCKED";
  let exitAttemptId: string | null = null;
  if (trainingPlanSummary?.unlockedExit) {
    if (exitAttempt) {
      exitAttemptId = exitAttempt.id;
      if (exitAttempt.status === AttemptStatus.IN_PROGRESS) {
        exitStatus = "IN_PROGRESS";
      } else if (exitAttempt.status === AttemptStatus.SUBMITTED) {
        exitStatus = "COMPLETED";
      } else {
        exitStatus = "READY";
      }
    } else {
      exitStatus = "READY";
    }
  }

  const joinedDate = new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return {
    status: "OK",
    data: {
      user,
      joinedDate,
      activeExam: activeAttempt
        ? {
            attemptId: activeAttempt.id,
            attemptKind: activeAttempt.kind,
            examId: activeAttempt.exam.id,
            examSlug: activeAttempt.exam.slug,
            examTitle: activeAttempt.exam.title,
          }
        : null,
      entry: {
        slug: entryExam?.slug ?? "saberpro_exam",
        title: entryExam?.title ?? "Prueba de entrada",
        description:
          entryExam?.description ??
          "Prueba de entrada de 35 preguntas para evaluar competencias en razonamiento cuantitativo.",
        questionCount: entryQuestionCount,
        durationMinutes: entryExam?.durationMinutes ?? 60,
        status: entryStatus,
        attemptId: entryAttemptId,
      },
      training: {
        slug: trainingExam?.slug ?? "prueba_general",
        title: trainingExam?.title ?? "Entrenamiento",
        description:
          trainingExam?.description ??
          "Evaluación completa con ayudas opcionales filtrada según tu plan de entrenamiento.",
        questionCount: trainingQuestionCount,
        durationMinutes: trainingExam?.durationMinutes ?? 90,
        status: trainingStatus,
        attemptId: trainingAttemptId,
        trainingPlan: trainingPlanSummary,
      },
      exit: {
        slug: entryExam?.slug ?? "saberpro_exam",
        title: "Prueba de salida",
        description:
          "Presenta nuevamente la Prueba de entrada para medir tu progreso" +
          (trainingPlanSummary ? ` (Plan ${trainingPlanSummary.code})` : ""),
        status: exitStatus,
        attemptId: exitAttemptId,
        progress: trainingPlanSummary
          ? {
              answeredCount: trainingPlanSummary.answeredCount,
              minRequiredToUnlockExit: trainingPlanSummary.minRequiredToUnlockExit,
              remainingToUnlockExit: trainingPlanSummary.remainingToUnlockExit,
              unlocked: trainingPlanSummary.unlockedExit,
            }
          : null,
      },
    },
  };
}
