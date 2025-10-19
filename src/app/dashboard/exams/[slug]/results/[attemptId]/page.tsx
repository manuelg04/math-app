import { redirect } from "next/navigation";
import { readAuthToken } from "@/lib/auth";
import { getExamAttemptById } from "@/server/services/exam-attempt-service";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ slug: string; attemptId: string }>;
}) {
  const authToken = await readAuthToken();
  if (!authToken) {
    redirect("/login");
  }

  const { slug, attemptId } = await params;
  const result = await getExamAttemptById(attemptId, authToken.sub);

  if (!result.success || !result.attempt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-destructive">Resultados no encontrados</h1>
          <p className="mt-2 text-muted-foreground">No se pudo cargar los resultados del examen.</p>
          <Link href="/dashboard">
            <Button className="mt-4">Volver al Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  const { attempt } = result;
  const totalQuestions = attempt.exam.questions.length;
  const correctAnswers = attempt.responses.filter((r) => r.isCorrect === true).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const score = attempt.score || 0;
  const timeSpentMinutes = attempt.timeSpent ? Math.floor(attempt.timeSpent / 60) : 0;
  const timeSpentSeconds = attempt.timeSpent ? attempt.timeSpent % 60 : 0;

  return (
    <main className="min-h-screen bg-secondary px-6 py-10 text-foreground lg:px-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground">
          <h1 className="text-3xl font-bold">¡Examen Completado!</h1>
          <p className="mt-2 text-lg text-primary-foreground/80">
            Has finalizado el examen exitosamente
          </p>
        </div>

        {/* Resultados */}
        <div className="mt-8 space-y-6">
          {/* Puntaje principal */}
          <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <div className="flex items-center justify-center">
              <TrendingUp className="mr-2 h-8 w-8 text-primary" />
              <span className="text-6xl font-bold text-primary">{score.toFixed(1)}%</span>
            </div>
            <p className="mt-4 text-lg font-medium text-muted-foreground">Puntaje Final</p>
          </div>

          {/* Detalles */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
              <p className="mt-4 text-3xl font-bold text-foreground">{correctAnswers}</p>
              <p className="mt-1 text-sm text-muted-foreground">Respuestas Correctas</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <XCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-4 text-3xl font-bold text-foreground">{incorrectAnswers}</p>
              <p className="mt-1 text-sm text-muted-foreground">Respuestas Incorrectas</p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <Clock className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-4 text-3xl font-bold text-foreground">
                {timeSpentMinutes}:{timeSpentSeconds.toString().padStart(2, "0")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Tiempo Total</p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Resumen del Intento</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Total de preguntas:</span> {totalQuestions}
              </p>
              <p>
                <span className="font-medium text-foreground">Fecha de inicio:</span>{" "}
                {new Date(attempt.startedAt).toLocaleString("es-CO")}
              </p>
              {attempt.submittedAt && (
                <p>
                  <span className="font-medium text-foreground">Fecha de finalización:</span>{" "}
                  {new Date(attempt.submittedAt).toLocaleString("es-CO")}
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/dashboard" className="flex-1">
              <Button variant="secondary" className="w-full">
                Volver al Dashboard
              </Button>
            </Link>
            <Link href={`/dashboard/exams/${slug}`} className="flex-1">
              <Button className="w-full">Intentar de Nuevo</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
