import { prisma } from "@/lib/prisma";

export type ExamWithQuestions = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
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

export async function getExamBySlug(
  slug: string
): Promise<{ success: true; exam: ExamWithQuestions } | { success: false; error: string }> {
  const exam = await prisma.exam.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
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
    return { success: false, error: "Examen no encontrado" };
  }

  return { success: true, exam: exam as ExamWithQuestions };
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
