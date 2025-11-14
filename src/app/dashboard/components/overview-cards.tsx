"use client";

import { DashboardUser, ExitExamSummary } from "@/types/dashboard";

type Props = {
  user: NonNullable<DashboardUser>;
  joinedDate: string;
  exit: ExitExamSummary;
};

export function OverviewCards({ user, joinedDate, exit }: Props) {
  return (
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
  );
}
