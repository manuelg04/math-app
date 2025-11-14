"use client";

import { ExamNavigation } from "./exam-navigation";

type Props = {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  hasAnswered: boolean;
  disabled: boolean;
};

export function ExamFooter({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  isLastQuestion,
  hasAnswered,
  disabled,
}: Props) {
  return (
    <footer className="flex-shrink-0 border-t border-border bg-white shadow-lg">
      <div className="mx-auto max-w-4xl">
        <ExamNavigation
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          onPrevious={onPrevious}
          onNext={onNext}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          isLastQuestion={isLastQuestion}
          hasAnswered={hasAnswered}
          disabled={disabled}
        />
      </div>
    </footer>
  );
}
