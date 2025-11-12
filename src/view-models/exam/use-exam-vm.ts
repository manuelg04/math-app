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

type AidKey = "AID1" | "AID2" | "AI_ASSIST";

type AttemptKindValue = "GENERIC" | "ENTRY" | "TRAINING" | "EXIT";

type LocalStorageData = {
  attemptId: string;
  answers: ExamAnswer[];
  timeSpent: number;
  currentIndex?: number;
  visibleAids?: Record<string, AidKey[]>;
  loggedAids?: Record<string, AidKey[]>;
};

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]*\)/i;
const HTML_IMAGE_PATTERN = /<img\b[^>]*>/i;

function containsImageContent(text?: string | null) {
  if (!text) return false;
  return MARKDOWN_IMAGE_PATTERN.test(text) || HTML_IMAGE_PATTERN.test(text);
}

export function useExamViewModel(examData: ExamData, attemptKind: AttemptKindValue) {
  const MAX_SECONDS = React.useMemo(
    () => (attemptKind === "TRAINING" ? Number.POSITIVE_INFINITY : examData.durationMinutes * 60),
    [attemptKind, examData.durationMinutes]
  );

  const router = useRouter();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, string>>(new Map());
  const [attemptId, setAttemptId] = React.useState<string | null>(null);

  const timeSpentRef = React.useRef(0);
  const [timeSnapshot, setTimeSnapshot] = React.useState(0);
  const [timeOver, setTimeOver] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ayudas visibles por pregunta y registro de ayudas notificadas
  const [visibleAids, setVisibleAids] = React.useState<Record<string, Set<AidKey>>>({});
  const [loggedAids, setLoggedAids] = React.useState<Record<string, Set<AidKey>>>({});
  const [aiAidState, setAiAidState] = React.useState<
    Record<string, { hint?: string; loading?: boolean; error?: string }>
  >({});
  const [academicProgram, setAcademicProgram] = React.useState<string | null>(null);

  const storageKey = React.useMemo(
    () => `exam_${examData.slug}_${attemptKind}`,
    [examData.slug, attemptKind]
  );
  const persistTimeoutRef = React.useRef<number | null>(null);

  // Control de peticiones de respuesta por pregunta (evitar carreras)
  const answerControllersRef = React.useRef<Record<string, AbortController | null>>({});
  const skipAutoStartRef = React.useRef(false);
  const pendingRestoreRef = React.useRef<LocalStorageData | null>(null);
  const hasHydratedPendingRef = React.useRef(false);

  React.useEffect(() => {
    if (attemptKind !== "TRAINING") return;
    const controller = new AbortController();
    let cancelled = false;
    async function loadProfile() {
      try {
        const resp = await fetch("/api/me", { signal: controller.signal });
        if (!resp.ok) return;
        const data = await resp.json().catch(() => null);
        if (cancelled) return;
        setAcademicProgram(data?.user?.academicProgram ?? null);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        console.warn("No se pudo cargar el perfil del usuario", error);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attemptKind]);

  const hydrateFromLocalData = React.useCallback(
    (data: LocalStorageData | null) => {
      if (!data) return;

      if (typeof data.timeSpent === "number" && Number.isFinite(data.timeSpent)) {
        timeSpentRef.current = data.timeSpent;
        setTimeSnapshot(data.timeSpent);
        if (data.timeSpent >= MAX_SECONDS) {
          setTimeOver(true);
        } else {
          setTimeOver(false);
        }
      }

      if (Array.isArray(data.answers)) {
        const answersMap = new Map<string, string>();
        for (const a of data.answers) {
          answersMap.set(a.questionId, a.selectedOptionId);
        }
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
    },
    [MAX_SECONDS, examData.questions.length]
  );

  const consumePendingRestore = React.useCallback(() => {
    if (hasHydratedPendingRef.current) return;
    if (!pendingRestoreRef.current) return;
    hydrateFromLocalData(pendingRestoreRef.current);
    pendingRestoreRef.current = null;
    hasHydratedPendingRef.current = true;
  }, [hydrateFromLocalData]);

  const resetLocalProgress = React.useCallback(() => {
    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
    answerControllersRef.current = {};
    pendingRestoreRef.current = null;
    hasHydratedPendingRef.current = false;
    timeSpentRef.current = 0;
    setTimeSnapshot(0);
    setTimeOver(false);
    setCurrentIndex(0);
    setAnswers(new Map<string, string>());
    setVisibleAids({});
    setLoggedAids({});
  }, []);

  // Cargar de localStorage (solo una vez)
  const [initialLoadDone, setInitialLoadDone] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data: LocalStorageData = JSON.parse(saved);
        hasHydratedPendingRef.current = false;
        if (data.attemptId) {
          pendingRestoreRef.current = data;
          setAttemptId(data.attemptId);
        } else {
          pendingRestoreRef.current = null;
          hydrateFromLocalData(data);
        }
      } catch (e) {
        console.error("Error al cargar datos guardados:", e);
        pendingRestoreRef.current = null;
        hasHydratedPendingRef.current = false;
      }
    } else {
      pendingRestoreRef.current = null;
      hasHydratedPendingRef.current = false;
    }
    setInitialLoadDone(true);
  }, [storageKey, hydrateFromLocalData]);

  // Serialización para localStorage
  const serializeAidState = React.useCallback(
    (state: Record<string, Set<AidKey>>): Record<string, AidKey[]> => {
      const result: Record<string, AidKey[]> = {};
      for (const [questionId, aids] of Object.entries(state)) {
        if (aids.size === 0) continue;
        result[questionId] = Array.from(aids);
      }
      return result;
    },
    []
  );

  // Guardar en localStorage
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

  // Persistir con debounce cuando cambia el snapshot de tiempo o el estado dependiente
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

  // Persistir al desmontar
  React.useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      persistExamState();
    };
  }, [persistExamState]);

  // Persistir también en beforeunload/pagehide (cierre o navegación abrupta)
  React.useEffect(() => {
    const handler = () => {
      try {
        persistExamState();
      } catch {
        // ignorar
      }
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [persistExamState]);

  // Iniciar intento (solo una vez completada la carga inicial)
  React.useEffect(() => {
    if (!initialLoadDone || skipAutoStartRef.current) return;

    if (attemptId) {
      // Validar attemptId
      (async () => {
        try {
          const resp = await fetch(`/api/exams/attempts/${attemptId}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: examData.id, attemptKind }),
          });
          if (!resp.ok) {
            console.warn("attemptId inválido para este examen, limpiando...");
            setAttemptId(null);
            resetLocalProgress();
            localStorage.removeItem(storageKey);
          } else {
            consumePendingRestore();
          }
        } catch (err) {
          console.error("Error al validar attemptId:", err);
          setAttemptId(null);
          resetLocalProgress();
          localStorage.removeItem(storageKey);
        }
      })();
      return;
    }

    // Crear attempt si no existe
    (async () => {
      try {
        const resp = await fetch("/api/exams/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: examData.id, attemptKind }),
        });
        const result = await resp.json();

        if (result.success) {
          setAttemptId(result.attempt.id);
        } else {
          const message = result.message || result.error || "No se pudo iniciar el entrenamiento";
          console.error("Error al iniciar intento:", message);
          toast({ variant: "error", description: message });

          const shouldRedirect =
            resp.status === 409 ||
            [
              "ENTRY_ALREADY_COMPLETED",
              "EXIT_ALREADY_COMPLETED",
              "EXIT_LOCKED",
              "EXIT_REQUIRES_PLACEMENT",
              "TRAINING_REQUIRES_PLACEMENT",
              "TRAINING_PLAN_INACTIVE",
            ].includes(result.code as string);

          if (shouldRedirect) {
            setTimeout(() => router.push("/dashboard"), 2000);
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
  }, [
    initialLoadDone,
    attemptId,
    examData.id,
    attemptKind,
    toast,
    router,
    storageKey,
    resetLocalProgress,
    consumePendingRestore,
  ]);

  // Pregunta y selección actual (normalizada a null)
  const currentQuestion = examData.questions[currentIndex];

  const questionHasMedia = React.useCallback((question: Question | null) => {
    if (!question) return false;
    if (containsImageContent(question.prompt)) return true;
    return question.choices.some(
      (choice) => Boolean(choice.imageUrl) || containsImageContent(choice.text)
    );
  }, []);
  const selectedOptionId: string | null = React.useMemo(() => {
    if (!currentQuestion) return null;
    return answers.get(currentQuestion.id) ?? null;
  }, [answers, currentQuestion]);

  // Seleccionar opción (optimista + control de concurrencia)
  const handleSelectOption = React.useCallback(
    async (optionId: string) => {
      if (!currentQuestion || !attemptId || timeOver) return;

      const questionId = currentQuestion.id;
      const previousOption = answers.get(questionId) ?? null;

      // No-op si es la misma opción
      if (previousOption === optionId) return;

      // Optimista
      setAnswers((prev) => {
        const updated = new Map(prev);
        updated.set(questionId, optionId);
        return updated;
      });

      // Abort de petición anterior para esta pregunta (si existiera)
      const prevController = answerControllersRef.current[questionId];
      if (prevController) {
        try {
          prevController.abort();
        } catch {
          // ignorar
        }
      }
      const controller = new AbortController();
      answerControllersRef.current[questionId] = controller;

      try {
        const resp = await fetch(`/api/exams/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, selectedOptionId: optionId }),
          signal: controller.signal,
          // mayor fiabilidad al cerrar o cambiar de página
          keepalive: true,
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.message ?? "No se pudo guardar la respuesta");
        }
      } catch (err) {
        // Ignorar abortos explícitos (por cambio rápido de selección)
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Error al guardar respuesta:", err);
        toast({
          variant: "error",
          description: err instanceof Error ? err.message : "No se pudo guardar la respuesta",
        });
        // Rollback
        setAnswers((prev) => {
          const rollback = new Map(prev);
          if (previousOption) {
            rollback.set(questionId, previousOption);
          } else {
            rollback.delete(questionId);
          }
          return rollback;
        });
      } finally {
        // Limpiar si es el controller actual
        if (answerControllersRef.current[questionId] === controller) {
          answerControllersRef.current[questionId] = null;
        }
      }
    },
    [attemptId, currentQuestion, timeOver, answers, toast]
  );

  // Navegación
  const handleNext = React.useCallback(() => {
    if (currentIndex < examData.questions.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, examData.questions.length]); // handleSubmit no se incluye para evitar reinstanciar; último paso no depende de closuras mutables

  const handlePrevious = React.useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((idx) => idx - 1);
  }, [currentIndex]);

  // Envío
  const handleSubmit = React.useCallback(async () => {
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
        keepalive: true,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.message ?? "Error al enviar el examen");
      }

      const result = await resp.json();

      if (result.success) {
        const finishedAttemptId = attemptId;
        skipAutoStartRef.current = true;
        setAttemptId(null);
        localStorage.removeItem(storageKey);
        router.push(`/dashboard/exams/${examData.slug}/results/${finishedAttemptId}`);
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
  }, [attemptId, isSubmitting, router, storageKey, examData.slug, toast]);

  // Tiempo
  const handleTimeUpdate = React.useCallback(
    (seconds: number) => {
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
    },
    [MAX_SECONDS]
  );

  // Auto-submit una vez al vencer el tiempo
  React.useEffect(() => {
    if (!timeOver || isSubmitting || !attemptId) return;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeOver, isSubmitting, attemptId]);

  React.useEffect(() => {
    if (attemptKind !== "TRAINING") return;
    if (typeof window === "undefined") return;
    const interval = window.setInterval(() => {
      handleTimeUpdate(timeSpentRef.current + 1);
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [attemptKind, handleTimeUpdate]);

  const aiAidAvailability = React.useMemo(() => {
    if (!currentQuestion) {
      return { available: false, reason: null as string | null };
    }
    if (attemptKind !== "TRAINING") {
      return { available: false, reason: "La ayuda IA solo está disponible en entrenamientos" };
    }
    if (questionHasMedia(currentQuestion)) {
      return { available: false, reason: "La ayuda IA no está disponible para preguntas con imágenes" };
    }
    return { available: true, reason: null };
  }, [attemptKind, currentQuestion, questionHasMedia]);

  const currentAiAid = currentQuestion ? aiAidState[currentQuestion.id] : undefined;

  const handleAiAidToggle = React.useCallback(async () => {
    if (!currentQuestion || !attemptId) return;

    if (!aiAidAvailability.available) {
      toast({
        variant: "error",
        description: aiAidAvailability.reason ?? "La ayuda IA no está disponible",
      });
      return;
    }

    const questionId = currentQuestion.id;
    const currentlyVisible = !!visibleAids[questionId]?.has("AI_ASSIST");
    if (currentlyVisible) {
      setVisibleAids((prev) => {
        const next = { ...prev };
        const updated = new Set(next[questionId] ?? []);
        updated.delete("AI_ASSIST");
        if (updated.size === 0) {
          delete next[questionId];
        } else {
          next[questionId] = updated;
        }
        return next;
      });
      return;
    }

    if (!currentAiAid?.hint) {
      setAiAidState((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          loading: true,
          error: undefined,
        },
      }));
      try {
        const resp = await fetch(`/api/exams/attempts/${attemptId}/aid/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            academicProgram: academicProgram ?? undefined,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || typeof data?.hint !== "string") {
          throw new Error(data?.message ?? "No se pudo generar la ayuda IA");
        }
        setAiAidState((prev) => ({
          ...prev,
          [questionId]: { hint: data.hint, loading: false, error: undefined },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo generar la ayuda IA";
        setAiAidState((prev) => ({
          ...prev,
          [questionId]: { ...prev[questionId], loading: false, error: message },
        }));
        toast({ variant: "error", description: message });
        return;
      }
    } else {
      setAiAidState((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], error: undefined },
      }));
    }

    setVisibleAids((prev) => {
      const next = { ...prev };
      const updated = new Set(next[questionId] ?? []);
      updated.add("AI_ASSIST");
      next[questionId] = updated;
      return next;
    });

    setLoggedAids((prev) => {
      const next = { ...prev };
      const updated = new Set(next[questionId] ?? []);
      updated.add("AI_ASSIST");
      next[questionId] = updated;
      return next;
    });
  }, [
    academicProgram,
    aiAidAvailability.available,
    aiAidAvailability.reason,
    attemptId,
    currentAiAid,
    currentQuestion,
    toast,
    visibleAids,
  ]);

  // Ayudas
  const toggleAid = async (key: AidKey) => {
    if (key === "AI_ASSIST") {
      await handleAiAidToggle();
      return;
    }

    if (!currentQuestion || !attemptId) return;

    const questionId = currentQuestion.id;
    const currentlyVisible = !!visibleAids[questionId]?.has(key);

    // Toggle local
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

    // Solo loggear la primera vez que se muestra
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
          keepalive: true,
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
  const hasAnswered = selectedOptionId !== null; // <-- corregido

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
    toggleAid,
    isAidVisible,
    MAX_SECONDS,
    timeOver,
    timeSpent: timeSnapshot,
    aiAid: {
      available: aiAidAvailability.available,
      disabledReason: aiAidAvailability.reason,
      loading: currentAiAid?.loading ?? false,
      hint: currentAiAid?.hint ?? null,
      error: currentAiAid?.error ?? null,
    },
  };
}
