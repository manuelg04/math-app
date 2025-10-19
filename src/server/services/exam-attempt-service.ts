import { prisma } from "@/lib/prisma";

export async function startExamAttempt(userId: string, examId: string) {
  const attempt = await prisma.examAttempt.create({
    data: { userId, examId, status: "IN_PROGRESS" },
    select: { id: true, startedAt: true, status: true },
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
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          questions: {
            select: { id: true },
          },
        },
      },
      responses: {
        select: { id: true, questionId: true, selectedOptionId: true, isCorrect: true },
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
  // 1) El intento debe pertenecer al usuario y estar en progreso
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
  });
  if (!attempt) return { success: false, error: "Intento no válido" };

  // 2) La opción debe pertenecer a la pregunta
  const option = await prisma.option.findUnique({
    where: { id: selectedOptionId },
    select: { isCorrect: true, questionId: true },
  });
  if (!option || option.questionId !== questionId) {
    return { success: false, error: "Opción no válida" };
  }

  // 3) Upsert respuesta
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
    console.log("[submitExamAttempt] Buscando intento:", { attemptId, userId });

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId, status: "IN_PROGRESS" },
      include: { responses: true, exam: { include: { questions: true } } },
    });

    if (!attempt) {
      console.error("[submitExamAttempt] Intento no encontrado o ya submitido");
      return { success: false, error: "Intento no válido" };
    }

    console.log("[submitExamAttempt] Intento encontrado:", {
      id: attempt.id,
      status: attempt.status,
      responsesCount: attempt.responses.length,
      questionsCount: attempt.exam.questions.length
    });

    const totalQuestions = attempt.exam.questions.length;
    const correctAnswers = attempt.responses.filter((r) => r.isCorrect === true).length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    console.log("[submitExamAttempt] Calculando score:", { totalQuestions, correctAnswers, score });

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        timeSpent,
        score,
      },
      select: { id: true, submittedAt: true, timeSpent: true, score: true, status: true },
    });

    console.log("[submitExamAttempt] Intento actualizado exitosamente");

    return {
      success: true,
      attempt: updatedAttempt,
      details: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
      },
    };
  } catch (error) {
    console.error("[submitExamAttempt] Error crítico:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar examen"
    };
  }
}

/**
 * Registrar uso de ayuda (Ayuda 1 / Ayuda 2 / AI futura)
 * Evita duplicados por (attemptId, questionId, aidKey).
 */
export async function logAidUsage(
  attemptId: string,
  questionId: string,
  aidKey: "AID1" | "AID2" | "AI_ASSIST",
  userId: string
) {
  // Validar intento del usuario en progreso
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (!attempt) return { success: false, error: "Intento no válido" };

  const usage = await prisma.examAidUsage.upsert({
    where: {
      attemptId_questionId_aidKey: { attemptId, questionId, aidKey },
    },
    create: { attemptId, questionId, aidKey },
    update: {}, // idempotente
    select: { id: true, attemptId: true, questionId: true, aidKey: true, createdAt: true },
  });

  return { success: true, usage };
}
