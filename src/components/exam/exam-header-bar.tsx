"use client";

import { ExamTimer } from "./exam-timer";
import { Button } from "@/components/ui/button";

type TrainingPlanMeta = {
  code: string;
  answeredCount: number;
  minRequiredToUnlockExit: number;
  totalQuestions: number;
};

type Props = {
  title: string;
  description: string | null;
  trainingPlan?: TrainingPlanMeta | null;
  attemptKind: "GENERIC" | "ENTRY" | "TRAINING" | "EXIT";
  timeSpent: number;
  maxSeconds: number;
  onTimeUpdate: (seconds: number) => void;
  onSubmit: () => void;
  onGoToDashboard: () => void;
};

export function ExamHeaderBar({
  title,
  description,
  trainingPlan,
  attemptKind,
  timeSpent,
  maxSeconds,
  onTimeUpdate,
  onSubmit,
  onGoToDashboard,
}: Props) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-white">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            {trainingPlan && attemptKind === "TRAINING" && (
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                Plan {trainingPlan.code} • {trainingPlan.answeredCount} / {trainingPlan.minRequiredToUnlockExit} preguntas
                para desbloquear salida • {trainingPlan.totalQuestions} totales
              </p>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end sm:text-right">
            {attemptKind === "TRAINING" ? (
              <div className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
                Entrenamiento sin límite de tiempo
              </div>
            ) : (
              <ExamTimer initialSeconds={timeSpent} limitSeconds={maxSeconds} onTimeUpdate={onTimeUpdate} onTimeOver={onSubmit} />
            )}
            <Button type="button" variant="secondary" className="w-full sm:w-auto text-sm py-2" onClick={onGoToDashboard}>
              Ir al menú principal
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
