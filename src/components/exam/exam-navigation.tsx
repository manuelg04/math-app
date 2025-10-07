"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ExamNavigationProps = {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  hasAnswered: boolean;
};

export function ExamNavigation({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  isLastQuestion,
  hasAnswered,
}: ExamNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t border-border bg-white px-6 py-4">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!canGoBack}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>

      <div className="text-sm text-muted-foreground">
        {currentIndex + 1} / {totalQuestions}
      </div>

      <Button
        onClick={onNext}
        disabled={!canGoNext || (!hasAnswered && !isLastQuestion)}
        className="gap-2"
      >
        {isLastQuestion ? "Finalizar" : "Siguiente"}
        {!isLastQuestion && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}
