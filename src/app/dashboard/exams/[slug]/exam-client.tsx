"use client";

import { ExamQuestion } from "@/components/exam/exam-question";
import { ExamOptions } from "@/components/exam/exam-options";
import { ExamNavigation } from "@/components/exam/exam-navigation";
import { ExamTimer } from "@/components/exam/exam-timer";
import { ExamProgress } from "@/components/exam/exam-progress";
import { useExamViewModel } from "@/view-models/exam/use-exam-vm";

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

export function ExamClient({ examData }: { examData: ExamData }) {
  const vm = useExamViewModel(examData);

  if (!vm.currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando examen...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{examData.title}</h1>
              {examData.description && (
                <p className="mt-1 text-sm text-muted-foreground">{examData.description}</p>
              )}
            </div>
            <ExamTimer initialSeconds={vm.timeSpent} onTimeUpdate={vm.handleTimeUpdate} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Progress */}
          <ExamProgress totalQuestions={vm.totalQuestions} answeredCount={vm.answeredCount} />

          {/* Question */}
          <ExamQuestion
            questionNumber={vm.currentIndex + 1}
            totalQuestions={vm.totalQuestions}
            prompt={vm.currentQuestion.prompt}
          />

          {/* Options */}
          <ExamOptions
            options={vm.currentQuestion.choices}
            selectedOptionId={vm.selectedOptionId ?? null}
            onSelect={vm.handleSelectOption}
            disabled={vm.loading}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white shadow-lg">
        <div className="mx-auto max-w-4xl">
          <ExamNavigation
            currentIndex={vm.currentIndex}
            totalQuestions={vm.totalQuestions}
            onPrevious={vm.handlePrevious}
            onNext={vm.handleNext}
            canGoBack={vm.canGoBack}
            canGoNext={vm.canGoNext}
            isLastQuestion={vm.isLastQuestion}
            hasAnswered={vm.hasAnswered}
          />
        </div>
      </div>

      {/* Bottom padding to prevent content from being hidden by fixed navigation */}
      <div className="h-20" />
    </main>
  );
}
