"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  orderIndex: number;
  code: string | null;
  prompt: string;
  competency: string | null;
  evidence: string | null;
  contentArea: string | null;
  context: string | null;
  choices: Array<{
    id: string;
    label: string;
    text: string;
  }>;
};

type ExamData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  questions: Question[];
};

type ExamAnswer = {
  questionId: string;
  selectedOptionId: string;
};

type LocalStorageData = {
  attemptId: string;
  answers: ExamAnswer[];
  timeSpent: number;
};

export function useExamViewModel(examData: ExamData) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<string, string>>(new Map());
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [timeSpent, setTimeSpent] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const storageKey = `exam_${examData.slug}`;

  // Cargar datos de localStorage al montar
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data: LocalStorageData = JSON.parse(saved);
        setAttemptId(data.attemptId);
        setTimeSpent(data.timeSpent || 0);
        const answersMap = new Map<string, string>();
        data.answers.forEach((ans) => {
          answersMap.set(ans.questionId, ans.selectedOptionId);
        });
        setAnswers(answersMap);
      } catch (error) {
        console.error("Error al cargar datos guardados:", error);
      }
    }
  }, [storageKey]);

  // Guardar en localStorage cuando cambian las respuestas o el tiempo
  React.useEffect(() => {
    if (attemptId) {
      const data: LocalStorageData = {
        attemptId,
        answers: Array.from(answers.entries()).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
        timeSpent,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [answers, timeSpent, attemptId, storageKey]);

  // Iniciar intento si no existe
  React.useEffect(() => {
    if (!attemptId) {
      const startAttempt = async () => {
        try {
          const response = await fetch("/api/exams/attempts/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: examData.id }),
          });

          const result = await response.json();
          if (result.success) {
            setAttemptId(result.attempt.id);
          } else {
            console.error("Error al iniciar intento:", result.message);
          }
        } catch (error) {
          console.error("Error al iniciar intento:", error);
        }
      };

      startAttempt();
    }
  }, [attemptId, examData.id]);

  const currentQuestion = examData.questions[currentIndex];
  const selectedOptionId = currentQuestion ? answers.get(currentQuestion.id) : null;

  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion || !attemptId) return;

    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, optionId);
    setAnswers(newAnswers);

    // Guardar respuesta en el backend
    try {
      await fetch(`/api/exams/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
        }),
      });
    } catch (error) {
      console.error("Error al guardar respuesta:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < examData.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      const response = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpent }),
      });

      const result = await response.json();
      if (result.success) {
        // Limpiar localStorage
        localStorage.removeItem(storageKey);
        // Redirigir a resultados
        router.push(`/dashboard/exams/${examData.slug}/results/${attemptId}`);
      } else {
        console.error("Error al enviar examen:", result.message);
        alert("Error al enviar el examen. Por favor intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error al enviar examen:", error);
      alert("Error al enviar el examen. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleTimeUpdate = React.useCallback((seconds: number) => {
    setTimeSpent(seconds);
  }, []);

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
  };
}
