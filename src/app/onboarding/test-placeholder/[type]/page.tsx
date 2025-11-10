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

  const testTypeNames = {
    "saber-pro": "Prueba Saber Pro",
    "icfes": "Saber 11°",
    "tyt": "Saber T&T",
  } as const;

  const testName = testTypeNames[params.type as keyof typeof testTypeNames] || "Prueba";

  return (
    <TestPlaceholder
      testType={params.type}
      testName={testName}
      userName={user.fullName}
    />
  );
}