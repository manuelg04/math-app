"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

const MAX_SECONDS = 90 * 60; // 90 minutos

export function useExamViewModel(examData: ExamData) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, string>>(new Map());
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [timeSpent, setTimeSpent] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Ayudas visibles por pregunta y registro de ayudas ya notificadas al backend
  const [visibleAids, setVisibleAids] = React.useState<Record<string, Set<AidKey>>>({});
  const [loggedAids, setLoggedAids] = React.useState<Record<string, Set<AidKey>>>({});

  const storageKey = `exam_${examData.slug}`;

  // Cargar de localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data: LocalStorageData = JSON.parse(saved);
        if (data.attemptId) {
          setAttemptId(data.attemptId);
        }
        if (typeof data.timeSpent === "number" && Number.isFinite(data.timeSpent)) {
          setTimeSpent(data.timeSpent);
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
  }, [storageKey, examData.questions.length]);

  // Guardar en localStorage
  const serializeAidState = (state: Record<string, Set<AidKey>>): Record<string, AidKey[]> => {
    const result: Record<string, AidKey[]> = {};
    for (const [questionId, aids] of Object.entries(state)) {
      if (aids.size === 0) continue;
      result[questionId] = Array.from(aids);
    }
    return result;
  };

  React.useEffect(() => {
    if (!attemptId) return;
    const data: LocalStorageData = {
      attemptId,
      timeSpent,
      currentIndex,
      answers: Array.from(answers.entries()).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
      visibleAids: serializeAidState(visibleAids),
      loggedAids: serializeAidState(loggedAids),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [answers, timeSpent, attemptId, storageKey, currentIndex, visibleAids, loggedAids]);

  // Iniciar intento
  React.useEffect(() => {
    if (attemptId) return;
    (async () => {
      try {
        const resp = await fetch("/api/exams/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: examData.id }),
        });
        const result = await resp.json();
        if (result.success) setAttemptId(result.attempt.id);
        else console.error("Error al iniciar intento:", result.message);
      } catch (err) {
        console.error("Error al iniciar intento:", err);
      }
    })();
  }, [attemptId, examData.id]);

  const currentQuestion = examData.questions[currentIndex];
  const selectedOptionId = currentQuestion ? answers.get(currentQuestion.id) : null;

  // Selección de opción
  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion || !attemptId) return;
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, optionId);
    setAnswers(newAnswers);

    try {
      await fetch(`/api/exams/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
        }),
      });
    } catch (err) {
      console.error("Error al guardar respuesta:", err);
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
      console.log("[handleSubmit] Bloqueado:", { attemptId, isSubmitting });
      return;
    }

    console.log("[handleSubmit] Iniciando envío:", { attemptId, timeSpent });
    setIsSubmitting(true);
    setLoading(true);

    try {
      const resp = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpent }),
      });

      console.log("[handleSubmit] Respuesta recibida:", resp.status);

      if (!resp.ok) {
        console.error("[handleSubmit] HTTP error:", resp.status, resp.statusText);
        alert("Error al enviar el examen. Intenta de nuevo.");
        return;
      }

      const result = await resp.json();
      console.log("[handleSubmit] Resultado parseado:", result);

      if (result.success) {
        console.log("[handleSubmit] Éxito, navegando a resultados");
        localStorage.removeItem(storageKey);
        router.push(`/dashboard/exams/${examData.slug}/results/${attemptId}`);
      } else {
        console.error("[handleSubmit] Fallo del servidor:", result.message || result.error);
        alert(`Error al enviar el examen: ${result.message || result.error || "Intenta de nuevo."}`);
      }
    } catch (err) {
      console.error("[handleSubmit] Excepción:", err);
      alert("Error al enviar el examen. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Tiempo
  const handleTimeUpdate = React.useCallback((seconds: number) => {
    setTimeSpent(seconds);
  }, []);
  const timeOver = timeSpent >= MAX_SECONDS;

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
        await fetch(`/api/exams/attempts/${attemptId}/aid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, aidKey: key }),
        });
      } catch (err) {
        console.error("Error al registrar ayuda:", err);
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
    timeSpent,
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
  };
}
