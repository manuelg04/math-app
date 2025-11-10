import Link from "next/link";
import { redirect } from "next/navigation";
import { AttemptKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { readAuthToken } from "@/lib/auth";
import { getExamForUser } from "@/server/services/exam-service";
import { ExamClient } from "./exam-client";

type ExamPageParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};

function resolveAttemptKind(slug: string, mode?: string | null): AttemptKind {
  if (slug === "saberpro_exam") {
    return mode?.toLowerCase() === "exit" ? AttemptKind.EXIT : AttemptKind.ENTRY;
  }
  if (slug === "prueba_general") {
    return AttemptKind.TRAINING;
  }
  return AttemptKind.GENERIC;
}

export default async function ExamPage({ params, searchParams }: ExamPageParams) {
  const authToken = await readAuthToken();
  if (!authToken) {
    redirect("/login");
  }

  const { slug } = await params;
  const { mode } = await searchParams;
  const attemptKind = resolveAttemptKind(slug, mode ?? null);

  const result = await getExamForUser(authToken.sub, slug, attemptKind);

  if (!result.success) {
    const remaining = result.meta?.trainingPlan?.remainingToUnlockExit ?? null;
    const answered = result.meta?.trainingPlan?.answeredCount ?? null;
    const minRequired = result.meta?.trainingPlan?.minRequiredToUnlockExit ?? null;
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-destructive">No puedes acceder a esta prueba</h1>
          <p className="mt-2 text-muted-foreground">{result.error}</p>
          {remaining !== null && minRequired !== null && answered !== null && (
            <p className="mt-4 text-sm text-muted-foreground">
              Progreso actual: {answered} / {minRequired} preguntas respondidas.
              {remaining > 0 ? ` Te faltan ${remaining} para desbloquearla.` : ""}
            </p>
          )}
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  return <ExamClient examData={result.exam} context={result.context} />;
}
