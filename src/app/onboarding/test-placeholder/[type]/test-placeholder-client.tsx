"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TestPlaceholderProps {
  testType: string;
  testName: string;
  userName: string;
}

export function TestPlaceholder({ testName, userName }: TestPlaceholderProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Error al completar el onboarding");
      }

      toast({
        variant: "success",
        title: "¡Bienvenido!",
        description: "Tu perfil ha sido completado exitosamente"
      });

      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "error",
        description: error instanceof Error ? error.message : "Error inesperado"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Prueba Diagnóstica - {testName}</CardTitle>
          <CardDescription className="text-lg">
            Hola {userName}, estás a punto de iniciar tu prueba diagnóstica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="mb-3 font-semibold">Información de la prueba:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Duración estimada: 45-60 minutos</li>
              <li>• Número de preguntas: Variable según tu desempeño</li>
              <li>• Áreas evaluadas: Comprensión lectora, Matemáticas, Inglés</li>
              <li>• Podrás ver tus resultados al finalizar</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              ⚠️ Esta es una versión placeholder de la prueba diagnóstica.
              La funcionalidad completa estará disponible próximamente.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Recomendaciones:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Busca un lugar tranquilo sin distracciones</li>
              <li>• Asegúrate de tener conexión estable a internet</li>
              <li>• Ten papel y lápiz a mano para hacer cálculos</li>
              <li>• No uses calculadora a menos que se indique</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1"
          >
            Omitir por ahora
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Procesando..." : "Comenzar prueba"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}