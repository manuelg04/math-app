import { prisma } from "@/lib/prisma";

export async function startExamAttempt(userId: string, examId: string) {
  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      examId,
      status: "IN_PROGRESS",
    },
    select: {
      id: true,
      startedAt: true,
      status: true,
    },
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

  if (!attempt) {
    return { success: false, error: "Intento no encontrado" };
  }

  return { success: true, attempt };
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string,
  userId: string
) {
  // Verificar que el intento pertenece al usuario y está en progreso
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
  });

  if (!attempt) {
    return { success: false, error: "Intento no válido" };
  }

  // Verificar si la opción es correcta
  const option = await prisma.option.findUnique({
    where: { id: selectedOptionId },
    select: { isCorrect: true, questionId: true },
  });

  if (!option || option.questionId !== questionId) {
    return { success: false, error: "Opción no válida" };
  }

  // Upsert la respuesta
  const response = await prisma.examResponse.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId,
      },
    },
    create: {
      attemptId,
      questionId,
      selectedOptionId,
      isCorrect: option.isCorrect,
    },
    update: {
      selectedOptionId,
      isCorrect: option.isCorrect,
      answeredAt: new Date(),
    },
    select: {
      id: true,
      questionId: true,
      selectedOptionId: true,
      isCorrect: true,
    },
  });

  return { success: true, response };
}

export async function submitExamAttempt(attemptId: string, userId: string, timeSpent: number) {
  // Verificar que el intento pertenece al usuario
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    include: {
      responses: true,
      exam: {
        include: {
          questions: true,
        },
      },
    },
  });

  if (!attempt) {
    return { success: false, error: "Intento no válido" };
  }

  // Calcular puntaje
  const totalQuestions = attempt.exam.questions.length;
  const correctAnswers = attempt.responses.filter((r) => r.isCorrect === true).length;
  const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Actualizar el intento
  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      timeSpent,
      score,
    },
    select: {
      id: true,
      submittedAt: true,
      timeSpent: true,
      score: true,
      status: true,
    },
  });

  return {
    success: true,
    attempt: updatedAttempt,
    details: {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
    },
  };
}
