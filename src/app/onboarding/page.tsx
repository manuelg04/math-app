import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readAuthToken } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const token = await readAuthToken();
  if (!token) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      email: true,
      onboardingComplete: true,
      fullName: true,
      profilePhoto: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingComplete) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
      <OnboardingForm
        initialData={{
          email: user.email,
          fullName: user.fullName || "",
          profilePhoto: user.profilePhoto || "",
        }}
      />
    </main>
  );
}