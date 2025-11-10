import { redirect } from "next/navigation";
import { AttemptKind, AttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readAuthToken } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

async function computeTrainingPlanSummary(userId: string, trainingPlanId: string) {
  const trainingPlan = await prisma.trainingPlan.findUnique({
    where: { id: trainingPlanId, isActive: true },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      minRequiredToUnlockExit: true,
      planQuestions: {
        select: { questionId: true },
      },
    },
  });

  if (!trainingPlan) return null;

  const questionIds = trainingPlan.planQuestions.map((pq) => pq.questionId);
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
    id: trainingPlan.id,
    code: trainingPlan.code,
    title: trainingPlan.title,
    description: trainingPlan.description,
    minRequiredToUnlockExit: trainingPlan.minRequiredToUnlockExit,
    totalQuestions,
    answeredCount,
    remainingToUnlockExit,
    unlockedExit: remainingToUnlockExit <= 0,
  };
}

export default async function DashboardPage() {
  const token = await readAuthToken();
  if (!token) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
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
    redirect("/login");
  }

  // Check if user needs to complete onboarding
  if (!user.onboardingComplete) {
    redirect("/onboarding");
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
    where: {
      userId: token.sub,
      status: AttemptStatus.IN_PROGRESS,
    },
    select: {
      id: true,
      kind: true,
      exam: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const entryAttemptPromise = entryExam
    ? prisma.examAttempt.findFirst({
        where: {
          userId: token.sub,
          examId: entryExam.id,
          kind: AttemptKind.ENTRY,
        },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const exitAttemptPromise = entryExam
    ? prisma.examAttempt.findFirst({
        where: {
          userId: token.sub,
          examId: entryExam.id,
          kind: AttemptKind.EXIT,
        },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const trainingAttemptPromise = trainingExam
    ? prisma.examAttempt.findFirst({
        where: {
          userId: token.sub,
          examId: trainingExam.id,
          kind: AttemptKind.TRAINING,
          status: AttemptStatus.IN_PROGRESS,
        },
        orderBy: { startedAt: "desc" },
      })
    : Promise.resolve(null);

  const placementPromise = prisma.placement.findFirst({
    where: { userId: token.sub },
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
    ? await computeTrainingPlanSummary(token.sub, placement.trainingPlanId)
    : null;

  const trainingQuestionCount = trainingPlanSummary?.totalQuestions
    ?? (trainingExam
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

  return (
    <DashboardClient
      initialData={{
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
            "Prueba diagnóstica de 35 preguntas para evaluar competencias en razonamiento cuantitativo.",
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
            "Presenta nuevamente la prueba diagnóstica para medir tu progreso" +
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
      }}
    />
  );
}
