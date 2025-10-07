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
    choices: Array<{
      id: string;
      label: string;
      text: string;
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
          choices: {
            select: {
              id: true,
              label: true,
              text: true,
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

  return { success: true, exam };
}

export async function getUserExamAttempts(userId: string, examId: string) {
  const attempts = await prisma.examAttempt.findMany({
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

  return attempts;
}
