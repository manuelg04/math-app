"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type TrainingCompletionModalProps = {
  open: boolean;
  onContinue: () => void;
  onGoToDashboard: () => void;
};

export function TrainingCompletionModal({
  open,
  onContinue,
  onGoToDashboard,
}: TrainingCompletionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Entrenamiento listo"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckCircle className="h-10 w-10" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">¡Mínimo completado!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ya respondiste el mínimo de preguntas requeridas para tu plan. La Prueba de salida quedó habilitada, puedes ir al dashboard o seguir practicando.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={onContinue}
            className="flex-1"
          >
            Continuar entrenamiento
          </Button>
          <Button type="button" onClick={onGoToDashboard} className="flex-1">
            Ir al dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
