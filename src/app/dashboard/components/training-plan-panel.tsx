"use client";

import { TrainingPlanSummary } from "@/types/dashboard";
import { StatusBadge } from "./status-badge";

type Props = {
  trainingPlan: TrainingPlanSummary;
};

export function TrainingPlanPanel({ trainingPlan }: Props) {
  return (
    <section className="mt-12">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tu plan de entrenamiento</h2>
            <p className="text-sm text-muted-foreground">
              Plan {trainingPlan.code}
              {trainingPlan.title ? ` • ${trainingPlan.title}` : ""}
            </p>
          </div>
          <StatusBadge label={trainingPlan.unlockedExit ? "Salida desbloqueada" : "Progreso"} />
        </div>
        <div className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">Preguntas del plan</p>
            <p>{trainingPlan.totalQuestions}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Minimo para desbloquear salida</p>
            <p>
              {trainingPlan.answeredCount} / {trainingPlan.minRequiredToUnlockExit}
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Restantes para la salida</p>
            <p>
              {trainingPlan.remainingToUnlockExit > 0
                ? trainingPlan.remainingToUnlockExit
                : "Objetivo cumplido"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
