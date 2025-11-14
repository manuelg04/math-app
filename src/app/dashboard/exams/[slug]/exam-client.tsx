"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useExamViewModel } from "@/view-models/exam/use-exam-vm";
import { TrainingCompletionModal } from "@/components/exam/training-completion-modal";
import { ExamHeaderBar } from "@/components/exam/exam-header-bar";
import { ExamBody } from "@/components/exam/exam-body";
import { ExamFooter } from "@/components/exam/exam-footer";
import { useDashboardNavigationFlag } from "@/hooks/use-dashboard-refresh-flag";

type AttemptKindValue = "GENERIC" | "ENTRY" | "TRAINING" | "EXIT";

type TrainingPlanSummary = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  minRequiredToUnlockExit: number;
  totalQuestions: number;
  answeredCount: number;
  remainingToUnlockExit: number;
  unlockedExit: boolean;
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
  choices: Array<{
    id: string;
    label: string;
    text: string;
    imageUrl?: string | null;
  }>;
};

type ExamData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questions: Question[];
};

type ExamClientProps = {
  examData: ExamData;
  context: {
    attemptKind: AttemptKindValue;
    trainingPlan?: TrainingPlanSummary;
  };
};

// Bloquea el scroll del body y del html mientras el examen está montado.
// Evita "rubber-band" arriba/abajo del viewport.
function useLockViewportScroll() {
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Type assertion for CSS properties not in TypeScript's CSSStyleDeclaration
    type CSSStyleWithOverscroll = CSSStyleDeclaration & { overscrollBehaviorY: string };

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = (html.style as CSSStyleWithOverscroll).overscrollBehaviorY || "";
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = (body.style as CSSStyleWithOverscroll).overscrollBehaviorY || "";
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = "hidden";
    (html.style as CSSStyleWithOverscroll).overscrollBehaviorY = "none";
    body.style.overflow = "hidden";
    (body.style as CSSStyleWithOverscroll).overscrollBehaviorY = "none";
    body.style.touchAction = "manipulation";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      (html.style as CSSStyleWithOverscroll).overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      (body.style as CSSStyleWithOverscroll).overscrollBehaviorY = prevBodyOverscroll;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, []);
}

export function ExamClient({ examData, context }: ExamClientProps) {
  const router = useRouter();
  const markDashboardForRefresh = useDashboardNavigationFlag();
  const { trainingPlan, attemptKind } = context;
  const showOptionalHelps = attemptKind === "TRAINING";
  const vm = useExamViewModel(examData, attemptKind);
  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedOptionId,
    answeredCount,
    loading,
    isLastQuestion,
    hasAnswered,
    canGoBack,
    canGoNext,
    handleSelectOption,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleTimeUpdate,
    toggleAid,
    isAidVisible,
    MAX_SECONDS,
    timeOver,
    timeSpent,
    aiAid,
  } = vm;
  const [trainingModalOpen, setTrainingModalOpen] = React.useState(false);
  const modalSeenRef = React.useRef(false);
  const trainingModalStorageKey = trainingPlan ? `training_plan_exit_modal_${trainingPlan.id}` : null;
  const trainingPlanAnsweredCount = trainingPlan?.answeredCount ?? 0;
  const trainingPlanMinRequired = trainingPlan?.minRequiredToUnlockExit ?? 0;
  const hasTrainingPlan = Boolean(trainingPlan);

  React.useEffect(() => {
    if (!trainingModalStorageKey) {
      modalSeenRef.current = true;
      setTrainingModalOpen(false);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    try {
      modalSeenRef.current = window.localStorage.getItem(trainingModalStorageKey) === "seen";
    } catch {
      modalSeenRef.current = false;
    }
    setTrainingModalOpen(false);
  }, [trainingModalStorageKey]);

  React.useEffect(() => {
    if (!hasTrainingPlan || attemptKind !== "TRAINING") return;
    if (trainingPlanAnsweredCount >= trainingPlanMinRequired) return;
    if (modalSeenRef.current) return;
    const totalAnswered = trainingPlanAnsweredCount + answeredCount;
    if (totalAnswered < trainingPlanMinRequired) return;
    modalSeenRef.current = true;
    if (trainingModalStorageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(trainingModalStorageKey, "seen");
      } catch {
        // ignore storage errors
      }
    }
    setTrainingModalOpen(true);
  }, [
    answeredCount,
    attemptKind,
    hasTrainingPlan,
    trainingModalStorageKey,
    trainingPlanAnsweredCount,
    trainingPlanMinRequired,
  ]);

  const handleGoToDashboard = React.useCallback(() => {
    markDashboardForRefresh();
    router.push("/dashboard");
  }, [markDashboardForRefresh, router]);

  const handleCloseTrainingModal = React.useCallback(() => {
    setTrainingModalOpen(false);
  }, []);

  // Bloquea scroll de ventana. Solo el contenedor central puede desplazarse.
  useLockViewportScroll();

  if (!currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando examen...</p>
        </div>
      </main>
    );
  }

  const headerTitle = attemptKind === "EXIT" ? "Prueba de salida" : examData.title;
  const headerDescription =
    attemptKind === "EXIT"
      ? "Presenta nuevamente la Prueba de entrada para medir tu progreso."
      : examData.description;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-secondary">
      <ExamHeaderBar
        title={headerTitle}
        description={headerDescription}
        trainingPlan={
          trainingPlan
            ? {
                code: trainingPlan.code,
                answeredCount: trainingPlan.answeredCount,
                minRequiredToUnlockExit: trainingPlan.minRequiredToUnlockExit,
                totalQuestions: trainingPlan.totalQuestions,
              }
            : null
        }
        attemptKind={attemptKind}
        timeSpent={timeSpent}
        maxSeconds={MAX_SECONDS}
        onTimeUpdate={handleTimeUpdate}
        onSubmit={handleSubmit}
        onGoToDashboard={handleGoToDashboard}
      />

      <ExamBody
        currentQuestion={currentQuestion}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        showOptionalHelps={showOptionalHelps}
        selectedOptionId={selectedOptionId ?? null}
        loading={loading}
        timeOver={timeOver}
        onSelectOption={handleSelectOption}
        onToggleAid={toggleAid}
        isAidVisible={isAidVisible}
        aiAid={aiAid}
      />

      <ExamFooter
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastQuestion={isLastQuestion}
        hasAnswered={hasAnswered}
        disabled={timeOver}
      />

      <TrainingCompletionModal open={trainingModalOpen} onContinue={handleCloseTrainingModal} onGoToDashboard={handleGoToDashboard} />
    </main>
  );
}
