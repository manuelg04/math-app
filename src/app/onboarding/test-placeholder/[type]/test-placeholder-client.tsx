"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TestPlaceholderProps {
  testName: string;
  userName: string;
  examId: string;
  examSlug: string;
  durationMinutes: number;
  questionCount: number;
}

export function TestPlaceholder({
  testName,
  userName,
  examId,
  examSlug,
  durationMinutes,
  questionCount,
}: TestPlaceholderProps) {
  const [startLoading, setStartLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const onboardingCompleted = useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  const finalizeOnboarding = useCallback(async () => {
    if (onboardingCompleted.current) {
      return;
    }

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message ?? "Error al completar el onboarding");
    }
    onboardingCompleted.current = true;
  }, []);

  const handleSkip = async () => {
    if (skipLoading) return;
    setSkipLoading(true);
    try {
      await finalizeOnboarding();
      toast({
        variant: "success",
        description: "Podrás iniciar la Prueba de entrada desde tu dashboard cuando quieras.",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "error",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setSkipLoading(false);
    }
  };

  const handleStartNow = async () => {
    if (startLoading) return;
    setStartLoading(true);
    try {
      await finalizeOnboarding();
      const response = await fetch("/api/exams/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          attemptKind: "ENTRY",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo iniciar la prueba");
      }

      router.push(`/dashboard/exams/${examSlug}`);
    } catch (error) {
      toast({
        variant: "error",
        description: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setStartLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Prueba de entrada - {testName}</CardTitle>
          <CardDescription className="text-lg">
            Hola {userName}, esta evaluación inicial define tu punto de partida dentro de la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="mb-3 font-semibold">Información de la prueba</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Duración estimada: {durationMinutes} minutos</li>
              <li>• Número de preguntas: {questionCount}</li>
              <li>• Intentos disponibles: 1 (Prueba de entrada)</li>
              <li>• Tus resultados desbloquearán tu plan de entrenamiento personalizado</li>
            </ul>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            Una vez inicies, deberás completar la prueba en una sola sesión. Si sales antes de terminar, tu intento contará como usado.
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Recomendaciones</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Busca un lugar tranquilo sin distracciones</li>
              <li>• Asegura una buena conexión a internet</li>
              <li>• Ten papel y lápiz para tus apuntes</li>
              <li>• Respira profundo antes de comenzar, esta prueba no tiene calificación oficial</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={handleSkip}
            disabled={skipLoading || startLoading}
            className="w-full sm:flex-1"
          >
            {skipLoading ? "Enviando..." : "Quiero hacerlo después"}
          </Button>
          <Button
            onClick={handleStartNow}
            disabled={startLoading || skipLoading}
            className="w-full sm:flex-1"
          >
            {startLoading ? "Iniciando..." : "Comenzar ahora"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
