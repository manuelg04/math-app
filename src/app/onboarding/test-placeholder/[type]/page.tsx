import { redirect } from "next/navigation";
import { readAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TestPlaceholder } from "./test-placeholder-client";

interface TestPlaceholderPageProps {
  params: {
    type: string;
  };
}

export default async function TestPlaceholderPage({ params }: TestPlaceholderPageProps) {
  const token = await readAuthToken();
  if (!token) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      fullName: true,
      onboardingComplete: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.fullName) {
    redirect("/onboarding");
  }

  const slugByType: Record<string, string> = {
    "saber-pro": "saberpro_exam",
  };

  const targetSlug = slugByType[params.type];
  if (!targetSlug) {
    redirect("/onboarding");
  }

  const exam = await prisma.exam.findUnique({
    where: { slug: targetSlug },
    select: {
      id: true,
      slug: true,
      title: true,
      durationMinutes: true,
    },
  });

  if (!exam) {
    redirect("/onboarding");
  }

  const questionCount = await prisma.question.count({
    where: { examId: exam.id },
  });

  return (
    <TestPlaceholder
      testName={exam.title}
      userName={user.fullName}
      examId={exam.id}
      examSlug={exam.slug}
      durationMinutes={exam.durationMinutes}
      questionCount={questionCount}
    />
  );
}
