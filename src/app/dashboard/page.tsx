import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readAuthToken } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

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

  // Check for active exam attempt
  const activeAttempt = await prisma.examAttempt.findFirst({
    where: {
      userId: token.sub,
      status: "IN_PROGRESS",
    },
    include: {
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
              examId: activeAttempt.exam.id,
              examSlug: activeAttempt.exam.slug,
              examTitle: activeAttempt.exam.title,
            }
          : null,
      }}
    />
  );
}
