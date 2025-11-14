"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActiveExam, EntryExamSummary, ExitExamSummary, TrainingExamSummary } from "@/types/dashboard";
import { StatusBadge } from "./status-badge";

function formatQuestionCount(count: number) {
  return `${count} ${count === 1 ? "pregunta" : "preguntas"}`;
}

function formatDuration(minutes: number) {
  return `${minutes} minutos`;
}

type Props = {
  activeExam: ActiveExam;
  entry: EntryExamSummary;
  training: TrainingExamSummary;
  exit: ExitExamSummary;
};

export function RoutesSection({ activeExam, entry, training, exit }: Props) {
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

  return (
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
        <EntryRouteCard entry={entry} entryStatusLabel={entryStatusLabel} activeExam={activeExam} />
        <TrainingRouteCard
          training={training}
          trainingStatusLabel={trainingStatusLabel}
          activeExam={activeExam}
          activeSlug={activeSlug}
        />
        <ExitRouteCard
          exit={exit}
          exitStatusLabel={exitStatusLabel}
          activeExam={activeExam}
          activeSlug={activeSlug}
          entryQuestionCount={entry.questionCount}
          entryDuration={entry.durationMinutes}
        />
      </div>
    </section>
  );
}

function EntryRouteCard({
  entry,
  entryStatusLabel,
  activeExam,
}: {
  entry: EntryExamSummary;
  entryStatusLabel: string;
  activeExam: ActiveExam;
}) {
  const activeSlug = activeExam?.examSlug ?? null;
  const activeKind = activeExam?.attemptKind ?? null;
  const entryActive = activeSlug === entry.slug && activeKind === "ENTRY";

  let action: React.ReactNode;
  if (entry.status === "COMPLETED") {
    action = (
      <Button className="mt-4 w-full" disabled>
        Completado
      </Button>
    );
  } else if (activeExam && !entryActive) {
    action = (
      <Button className="mt-4 w-full" disabled variant="secondary">
        Finaliza tu entrenamiento activo primero
      </Button>
    );
  } else {
    const label =
      entry.status === "IN_PROGRESS" || entryActive ? "Continuar prueba de entrada" : "Iniciar prueba de entrada";
    action = (
      <Link href={`/dashboard/exams/${entry.slug}`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  }

  return (
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
      {action}
    </div>
  );
}

function TrainingRouteCard({
  training,
  trainingStatusLabel,
  activeExam,
  activeSlug,
}: {
  training: TrainingExamSummary;
  trainingStatusLabel: string;
  activeExam: ActiveExam;
  activeSlug: string | null;
}) {
  const trainingActive = activeSlug === training.slug;

  let action: React.ReactNode;
  if (training.status === "LOCKED") {
    action = (
      <Button className="mt-4 w-full" disabled variant="secondary">
        Completa la prueba de entrada para desbloquear
      </Button>
    );
  } else if (activeExam && !trainingActive) {
    action = (
      <Button className="mt-4 w-full" disabled variant="secondary">
        Finaliza tu examen activo primero
      </Button>
    );
  } else {
    const label = training.status === "IN_PROGRESS" ? "Continuar entrenamiento" : "Iniciar entrenamiento";
    action = (
      <Link href={`/dashboard/exams/${training.slug}`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Entrenamiento</h3>
          <p className="mt-2 text-sm text-muted-foreground">{training.description}</p>
        </div>
        <StatusBadge label={trainingStatusLabel} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>📊 {formatQuestionCount(training.questionCount)}</span>
        <div className="flex items-center gap-2">
          <span>🛠️ Plan personalizado</span>
          {training.trainingPlan && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                training.trainingPlan.unlockedExit ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {training.trainingPlan.unlockedExit
                ? "Salida desbloqueada"
                : training.trainingPlan.remainingToUnlockExit === 1
                ? "Falta 1 respuesta para la salida"
                : `Faltan ${training.trainingPlan.remainingToUnlockExit} respuestas para la salida`}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function ExitRouteCard({
  exit,
  exitStatusLabel,
  activeExam,
  activeSlug,
  entryQuestionCount,
  entryDuration,
}: {
  exit: ExitExamSummary;
  exitStatusLabel: string;
  activeExam: ActiveExam;
  activeSlug: string | null;
  entryQuestionCount: number;
  entryDuration: number;
}) {
  const exitActive = activeSlug === exit.slug && activeExam?.attemptKind === "EXIT";

  let action: React.ReactNode;
  if (exit.status === "COMPLETED") {
    action = (
      <Button className="mt-4 w-full" disabled>
        Completado
      </Button>
    );
  } else if (exit.status === "LOCKED") {
    action = (
      <Button className="mt-4 w-full" disabled variant="secondary">
        Responde tu plan para desbloquear
      </Button>
    );
  } else if (activeExam && !exitActive) {
    action = (
      <Button className="mt-4 w-full" disabled variant="secondary">
        Finaliza tu examen activo primero
      </Button>
    );
  } else {
    const label = exit.status === "IN_PROGRESS" || exitActive ? "Continuar salida" : "Iniciar salida";
    action = (
      <Link href={`/dashboard/exams/${exit.slug}?mode=exit`} className="mt-4 block">
        <Button className="w-full">{label}</Button>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{exit.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{exit.description}</p>
        </div>
        <StatusBadge label={exitStatusLabel} />
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>📊 {formatQuestionCount(entryQuestionCount)}</span>
        <span>⏱️ {formatDuration(entryDuration)}</span>
        <span>🎯 Mide tu progreso</span>
      </div>
      {exit.progress && (
        <p className="mt-4 text-xs text-muted-foreground">
          Progreso del plan: {exit.progress.answeredCount}/{exit.progress.minRequiredToUnlockExit} respondidas
        </p>
      )}
      {action}
    </div>
  );
}
