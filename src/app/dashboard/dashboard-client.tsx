"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDashboardViewModel, type DashboardData } from "@/view-models/dashboard/use-dashboard-vm";

function getAcademicProgramName(program: string): string {
  const programs: Record<string, string> = {
    ingenieria: "Facultad de Ingeniería",
    derecho: "Facultad de Derecho",
    administracion: "Administración de Empresas",
    economia: "Economía",
    ciencias: "Ciencias Básicas",
  };
  return programs[program] || program;
}

function formatQuestionCount(count: number) {
  return `${count} ${count === 1 ? "pregunta" : "preguntas"}`;
}

function formatDuration(minutes: number) {
  return `${minutes} minutos`;
}

const statusStyles: Record<string, string> = {
  PENDIENTE: "bg-blue-100 text-blue-700",
  "EN CURSO": "bg-amber-100 text-amber-800",
  COMPLETADO: "bg-emerald-100 text-emerald-700",
  BLOQUEADO: "bg-slate-100 text-slate-600",
  DISPONIBLE: "bg-green-100 text-green-700",
};

function StatusBadge({ label }: { label: string }) {
  const className = statusStyles[label.toUpperCase()] ?? "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, joinedDate, activeExam, entry, training, exit, loading, handleLogout } =
    useDashboardViewModel(initialData);

  if (!user) return null;

  const activeSlug = activeExam?.examSlug ?? null;
  const activeKind = activeExam?.attemptKind ?? null;

  const entryStatusLabel =
    entry.status === "COMPLETED" ? "Completado" : entry.status === "IN_PROGRESS" ? "En curso" : "Pendiente";
  const trainingStatusLabel =
    training.status === "LOCKED"
      ? "Bloqueado"
      : training.status === "IN_PROGRESS"
      ? "En curso"
      : "Disponible";
  const exitStatusLabel =
    exit.status === "COMPLETED"
      ? "Completado"
      : exit.status === "IN_PROGRESS"
      ? "En curso"
      : exit.status === "READY"
      ? "Disponible"
      : "Bloqueado";

  const activeExamLabel = activeExam
    ? activeKind === "ENTRY"
      ? "Prueba de entrada"
      : activeKind === "TRAINING"
      ? "Entrenamiento"
      : activeKind === "EXIT"
      ? "Prueba de salida"
      : activeExam.examTitle
    : null;

  const entryActive = activeSlug === entry.slug && activeKind === "ENTRY";
  const exitActive = activeSlug === exit.slug && activeKind === "EXIT";
  const trainingActive = activeSlug === training.slug;

  // Helper to render footer buttons
  const renderEntryButton = () => {
    if (entry.status === "COMPLETED") {
      return (
        <Button className="mt-4 w-full" disabled>
          Completado
        </Button>
      );
    }

    if (activeExam && !entryActive) {
      return (
        <Button className="mt-4 w-full" disabled variant="secondary">
          Finaliza tu entrenamiento activo primero
        </Button>
      );
    }

    const label = entry.status === "IN_PROGRESS" || entryActive ? "Continuar entrenamiento" : "Iniciar entrenamiento";
    return (
      <Link href={`/dashboard/exams/${entry.slug}`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  };

  const renderTrainingButton = () => {
    if (training.status === "LOCKED") {
      return (
        <Button className="mt-4 w-full" disabled variant="secondary">
          Completa la prueba de entrada para desbloquear
        </Button>
      );
    }

    if (activeExam && !trainingActive) {
      return (
        <Button className="mt-4 w-full" disabled variant="secondary">
          Finaliza tu examen activo primero
        </Button>
      );
    }

    const label = training.status === "IN_PROGRESS" ? "Continuar entrenamiento" : "Iniciar entrenamiento";
    return (
      <Link href={`/dashboard/exams/${training.slug}`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  };

  const renderExitButton = () => {
    if (exit.status === "COMPLETED") {
      return (
        <Button className="mt-4 w-full" disabled>
          Completado
        </Button>
      );
    }

    if (exit.status === "LOCKED") {
      return (
        <Button className="mt-4 w-full" disabled variant="secondary">
          Responde tu plan para desbloquear
        </Button>
      );
    }

    if (activeExam && !exitActive) {
      return (
        <Button className="mt-4 w-full" disabled variant="secondary">
          Finaliza tu examen activo primero
        </Button>
      );
    }

    const label = exit.status === "IN_PROGRESS" || exitActive ? "Continuar salida" : "Iniciar salida";
    return (
      <Link href={`/dashboard/exams/${exit.slug}?mode=exit`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-secondary px-6 py-10 text-foreground lg:px-16">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary px-6 py-10 text-primary-foreground lg:flex-row lg:items-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em]">Panel principal</p>
          <h1 className="text-3xl font-semibold">Hola, {user.fullName || user.email}</h1>
          <p className="text-sm text-primary-foreground/80">
            {user.academicProgram ? `${getAcademicProgramName(user.academicProgram)} • ` : ""}
            Rol: {user.role}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout} disabled={loading}>
          {loading ? "Cerrando..." : "Cerrar sesión"}
        </Button>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Estado de cuenta</h2>
          <p className="mt-2 text-xl font-bold text-foreground">Activo</p>
          <p className="mt-4 text-sm text-muted-foreground">Desde {joinedDate}</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Aceptación de términos</h2>
          <p className="mt-2 text-xl font-bold text-foreground">{user.acceptedTos ? "Confirmada" : "Pendiente"}</p>
          <p className="mt-4 text-sm text-muted-foreground">Puedes actualizar tus preferencias pronto.</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Progreso general</h2>
          <p className="mt-2 text-xl font-bold text-foreground">
            {exit.progress?.unlocked ? "Salida desbloqueada" : "Plan en desarrollo"}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {exit.progress
              ? `${exit.progress.answeredCount}/${exit.progress.minRequiredToUnlockExit} preguntas respondidas del plan`
              : "Completa la prueba de entrada para recibir tu plan personalizado."}
          </p>
        </article>
      </section>

      {training.trainingPlan && (
        <section className="mt-12">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tu plan de entrenamiento</h2>
                <p className="text-sm text-muted-foreground">
                  Plan {training.trainingPlan.code}
                  {training.trainingPlan.title ? ` • ${training.trainingPlan.title}` : ""}
                </p>
              </div>
              <StatusBadge
                label={training.trainingPlan.unlockedExit ? "Salida desbloqueada" : "Progreso"}
              />
            </div>
            <div className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
              <div>
                <p className="font-semibold text-foreground">Preguntas del plan</p>
                <p>{training.trainingPlan.totalQuestions}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Respondidas</p>
                <p>
                  {training.trainingPlan.answeredCount} / {training.trainingPlan.minRequiredToUnlockExit}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Restantes para la salida</p>
                <p>
                  {training.trainingPlan.remainingToUnlockExit > 0
                    ? training.trainingPlan.remainingToUnlockExit
                    : "Objetivo cumplido"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">Rutas de entrenamiento</h2>
        {activeExam && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">
              Tienes un entrenamiento en progreso: {activeExamLabel ?? activeExam.examTitle}
            </p>
            <p className="mt-1 text-amber-700">Continúa o finaliza antes de iniciar uno nuevo.</p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Prueba de entrada</h3>
                <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
              </div>
              <StatusBadge label={entryStatusLabel} />
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>📊 {formatQuestionCount(entry.questionCount)}</span>
              <span>⏱️ {formatDuration(entry.durationMinutes)}</span>
              <span>📝 Selección múltiple</span>
            </div>
            {renderEntryButton()}
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Entrenamiento</h3>
                <p className="mt-2 text-sm text-muted-foreground">{training.description}</p>
              </div>
              <StatusBadge label={trainingStatusLabel} />
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>📊 {formatQuestionCount(training.questionCount)}</span>
              <span>🛠️ Plan personalizado</span>
            </div>
            {renderTrainingButton()}
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{exit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{exit.description}</p>
              </div>
              <StatusBadge label={exitStatusLabel} />
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>📊 {formatQuestionCount(entry.questionCount)}</span>
              <span>⏱️ {formatDuration(entry.durationMinutes)}</span>
              <span>🎯 Mide tu progreso</span>
            </div>
            {exit.progress && (
              <p className="mt-4 text-xs text-muted-foreground">
                Progreso del plan: {exit.progress.answeredCount}/{exit.progress.minRequiredToUnlockExit} respondidas
              </p>
            )}
            {renderExitButton()}
          </div>
        </div>
      </section>
    </main>
  );
}
