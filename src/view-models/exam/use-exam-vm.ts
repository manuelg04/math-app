"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type Choice = {
  id: string;
  label: string;
  text: string;
  imageUrl?: string | null;
};

type Question = {
  id: string;
  orderIndex: number;
  code: string | null;
  prompt: string;
  competency: string | null;
  evidence: string | null;
  contentArea: string | null;
  context: string | null;
  help1Md: string | null;
  help2Md: string | null;
  choices: Choice[];
};

type ExamData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questions: Question[];
};

type ExamAnswer = { questionId: string; selectedOptionId: string };

type LocalStorageData = {
  attemptId: string;
  answers: ExamAnswer[];
  timeSpent: number;
  currentIndex?: number;
  visibleAids?: Record<string, AidKey[]>;
  loggedAids?: Record<string, AidKey[]>;
};

type AidKey = "AID1" | "AID2" | "AI_ASSIST";

export function useExamViewModel(examData: ExamData) {
  const MAX_SECONDS = examData.durationMinutes * 60;
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, string>>(new Map());
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const timeSpentRef = React.useRef(0);
  const [timeSnapshot, setTimeSnapshot] = React.useState(0);
  const [timeOver, setTimeOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Ayudas visibles por pregunta y registro de ayudas ya notificadas al backend
  const [visibleAids, setVisibleAids] = React.useState<Record<string, Set<AidKey>>>({});
  const [loggedAids, setLoggedAids] = React.useState<Record<string, Set<AidKey>>>({});

  const storageKey = `exam_${examData.slug}`;
  const persistTimeoutRef = React.useRef<number | null>(null);

  // Cargar de localStorage
  const [initialLoadDone, setInitialLoadDone] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data: LocalStorageData = JSON.parse(saved);
        if (data.attemptId) {
          setAttemptId(data.attemptId);
        }
        if (typeof data.timeSpent === "number" && Number.isFinite(data.timeSpent)) {
          timeSpentRef.current = data.timeSpent;
          setTimeSnapshot(data.timeSpent);
          if (data.timeSpent >= MAX_SECONDS) {
            setTimeOver(true);
          }
        }
        if (Array.isArray(data.answers)) {
          const answersMap = new Map<string, string>();
          for (const a of data.answers) answersMap.set(a.questionId, a.selectedOptionId);
          setAnswers(answersMap);
        }
        if (typeof data.currentIndex === "number" && examData.questions.length > 0) {
          const safeIndex = Math.min(
            Math.max(Math.floor(data.currentIndex), 0),
            examData.questions.length - 1
          );
          setCurrentIndex(safeIndex);
        }
        if (data.visibleAids) {
          const entries = Object.entries(data.visibleAids).map(([questionId, aids]) => [
            questionId,
            new Set((aids ?? []) as AidKey[]),
          ]);
          setVisibleAids(Object.fromEntries(entries) as Record<string, Set<AidKey>>);
        }
        if (data.loggedAids) {
          const entries = Object.entries(data.loggedAids).map(([questionId, aids]) => [
            questionId,
            new Set((aids ?? []) as AidKey[]),
          ]);
          setLoggedAids(Object.fromEntries(entries) as Record<string, Set<AidKey>>);
        }
      } catch (e) {
        console.error("Error al cargar datos guardados:", e);
      }
    }
    setInitialLoadDone(true);
  }, [storageKey, examData.questions.length]);

  // Guardar en localStorage
  const serializeAidState = React.useCallback((state: Record<string, Set<AidKey>>): Record<string, AidKey[]> => {
    const result: Record<string, AidKey[]> = {};
    for (const [questionId, aids] of Object.entries(state)) {
      if (aids.size === 0) continue;
      result[questionId] = Array.from(aids);
    }
    return result;
  }, []);

  const persistExamState = React.useCallback(() => {
    if (!attemptId) return;
    const data: LocalStorageData = {
      attemptId,
      timeSpent: timeSpentRef.current,
      currentIndex,
      answers: Array.from(answers.entries()).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
      visibleAids: serializeAidState(visibleAids),
      loggedAids: serializeAidState(loggedAids),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("No se pudo guardar el progreso del examen", error);
    }
  }, [answers, attemptId, currentIndex, loggedAids, serializeAidState, storageKey, visibleAids]);

  React.useEffect(() => {
    if (!attemptId) return;
    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = window.setTimeout(() => {
      persistExamState();
      persistTimeoutRef.current = null;
    }, 700);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
    };
  }, [persistExamState, attemptId, timeSnapshot]);

  React.useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      persistExamState();
    };
  }, [persistExamState]);

  // Iniciar intento (solo si no hay attemptId guardado en localStorage)
  React.useEffect(() => {
    // Esperar a que se complete la carga inicial de localStorage
    if (!initialLoadDone) return;

    // Si ya hay attemptId (cargado de localStorage o creado), validar que pertenezca a este examen
    if (attemptId) {
      // Verificar en el servidor que este attemptId sea válido para este examen
      (async () => {
        try {
          const resp = await fetch(`/api/exams/attempts/${attemptId}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: examData.id }),
          });

          if (!resp.ok) {
            // El attemptId no es válido para este examen, limpiarlo
            console.warn("attemptId inválido para este examen, limpiando...");
            setAttemptId(null);
            localStorage.removeItem(storageKey);
          }
        } catch (err) {
          console.error("Error al validar attemptId:", err);
          // En caso de error, limpiar por seguridad
          setAttemptId(null);
          localStorage.removeItem(storageKey);
        }
      })();
      return;
    }

    // No hay attemptId, intentar crear uno nuevo
    (async () => {
      try {
        const resp = await fetch("/api/exams/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: examData.id }),
        });
        const result = await resp.json();

        if (result.success) {
          setAttemptId(result.attempt.id);
        } else {
          console.error("Error al iniciar intento:", result.message);

          // Si hay examen activo (409), redirigir al dashboard
          if (resp.status === 409) {
            toast({
              variant: "error",
              description: "Ya tienes un examen en progreso. Redirigiéndote al dashboard...",
            });
            setTimeout(() => router.push("/dashboard"), 2000);
          } else {
            toast({
              variant: "error",
              description: result.message || "No se pudo iniciar el examen",
            });
          }
        }
      } catch (err) {
        console.error("Error al iniciar intento:", err);
        toast({
          variant: "error",
          description: "Error al conectar con el servidor",
        });
      }
    })();
  }, [initialLoadDone, attemptId, examData.id, toast, router, storageKey]);

  const currentQuestion = examData.questions[currentIndex];
  const selectedOptionId = currentQuestion ? answers.get(currentQuestion.id) : null;

  // Selección de opción
  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion || !attemptId) return;

    const previousOption = answers.get(currentQuestion.id) ?? null;
    setAnswers((prev) => {
      const updated = new Map(prev);
      updated.set(currentQuestion.id, optionId);
      return updated;
    });

    try {
      const resp = await fetch(`/api/exams/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.message ?? "No se pudo guardar la respuesta");
      }
    } catch (err) {
      console.error("Error al guardar respuesta:", err);
      toast({
        variant: "error",
        description: err instanceof Error ? err.message : "No se pudo guardar la respuesta",
      });
      setAnswers((prev) => {
        const rollback = new Map(prev);
        if (previousOption) {
          rollback.set(currentQuestion.id, previousOption);
        } else {
          rollback.delete(currentQuestion.id);
        }
        return rollback;
      });
    }
  };

  // Navegación
  const handleNext = () => {
    if (currentIndex < examData.questions.length - 1) setCurrentIndex(currentIndex + 1);
    else handleSubmit();
  };
  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  // Envío
  const handleSubmit = async () => {
    if (!attemptId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const resp = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpent: timeSpentRef.current }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.message ?? "Error al enviar el examen");
      }

      const result = await resp.json();

      if (result.success) {
        localStorage.removeItem(storageKey);
        router.push(`/dashboard/exams/${examData.slug}/results/${attemptId}`);
      } else {
        throw new Error(result.message || result.error || "Error al enviar el examen");
      }
    } catch (err) {
      console.error("Error al enviar examen:", err);
      toast({
        variant: "error",
        description: err instanceof Error ? err.message : "Error al enviar el examen. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Tiempo
  const handleTimeUpdate = React.useCallback((seconds: number) => {
    timeSpentRef.current = seconds;
    if (seconds >= MAX_SECONDS) {
      setTimeOver(true);
      setTimeSnapshot(seconds);
      return;
    }
    if (seconds === 0) {
      setTimeSnapshot(0);
      return;
    }
    setTimeSnapshot((previous) => {
      if (seconds < previous) {
        return seconds;
      }
      if (seconds - previous >= 15) {
        return seconds;
      }
      return previous;
    });
  }, []);

  // Auto-submit al vencer tiempo (una sola vez)
  React.useEffect(() => {
    if (!timeOver || isSubmitting || !attemptId) return;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeOver, isSubmitting, attemptId]);

  // Ayudas
  const toggleAid = async (key: AidKey) => {
    if (!currentQuestion || !attemptId) return;

    // Visibilidad local (toggle)
    const questionId = currentQuestion.id;
    const currentlyVisible = !!visibleAids[questionId]?.has(key);

    setVisibleAids((prev) => {
      const next = { ...prev };
      const updated = new Set(prev[questionId] ?? []);
      if (currentlyVisible) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      if (updated.size === 0) {
        delete next[questionId];
      } else {
        next[questionId] = updated;
      }
      return next;
    });

    if (currentlyVisible) return;

    const alreadyLogged = loggedAids[questionId]?.has(key) ?? false;
    if (!alreadyLogged) {
      setLoggedAids((prev) => {
        if (prev[questionId]?.has(key)) return prev;
        const next = { ...prev };
        const updated = new Set(prev[questionId] ?? []);
        updated.add(key);
        next[questionId] = updated;
        return next;
      });

      try {
        const resp = await fetch(`/api/exams/attempts/${attemptId}/aid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, aidKey: key }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.message ?? "No se pudo registrar la ayuda");
        }
      } catch (err) {
        console.error("Error al registrar ayuda:", err);
        toast({
          variant: "error",
          description: err instanceof Error ? err.message : "No se pudo registrar la ayuda",
        });
        setLoggedAids((prev) => {
          const next = { ...prev };
          const current = new Set(next[questionId] ?? []);
          current.delete(key);
          if (current.size === 0) {
            delete next[questionId];
          } else {
            next[questionId] = current;
          }
          return next;
        });
      }
    }
  };

  const isAidVisible = (qId: string, key: AidKey) => !!visibleAids[qId]?.has(key);

  const answeredCount = answers.size;
  const isLastQuestion = currentIndex === examData.questions.length - 1;
  const hasAnswered = selectedOptionId !== null;

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: examData.questions.length,
    selectedOptionId,
    answeredCount,
    loading,
    isLastQuestion,
    hasAnswered,
    canGoBack: currentIndex > 0,
    canGoNext: currentIndex < examData.questions.length - 1 || isLastQuestion,
    handleSelectOption,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleTimeUpdate,
    // ayudas
    toggleAid,
    isAidVisible,
    MAX_SECONDS,
    timeOver,
    timeSpent: timeSnapshot,
  };
}
