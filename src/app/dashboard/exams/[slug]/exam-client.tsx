"use client";

import * as React from "react";
import { ExamQuestion } from "@/components/exam/exam-question";
import { ExamOptions } from "@/components/exam/exam-options";
import { ExamNavigation } from "@/components/exam/exam-navigation";
import { ExamTimer } from "@/components/exam/exam-timer";
import { ExamProgress } from "@/components/exam/exam-progress";
import { ExamHelps } from "@/components/exam/exam-helps";
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
  questions: Question[];
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

export function ExamClient({ examData }: { examData: ExamData }) {
  const vm = useExamViewModel(examData);

  // Bloquea scroll de ventana. Solo el contenedor central puede desplazarse.
  useLockViewportScroll();

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
    // h-[100dvh] usa el alto del viewport dinámico y evita saltos con toolbars.
    // overflow-hidden asegura que la ventana no tenga scroll.
    <main className="flex h-[100dvh] flex-col bg-secondary overflow-hidden">
      {/* Header fijo (no necesita sticky porque el scroll es interno) */}
      <header className="flex-shrink-0 border-b border-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{examData.title}</h1>
              {examData.description && (
                <p className="mt-1 text-sm text-muted-foreground">{examData.description}</p>
              )}
            </div>
            <ExamTimer
              initialSeconds={vm.timeSpent}
              limitSeconds={vm.MAX_SECONDS}
              onTimeUpdate={vm.handleTimeUpdate}
              onTimeOver={vm.handleSubmit}
            />
          </div>
        </div>
      </header>

      {/* ÚNICO contenedor desplazable */}
      <section className="flex-1 min-h-0 overflow-y-auto overscroll-none">
        <div className="mx-auto max-w-4xl px-4 pt-6 pb-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <ExamProgress totalQuestions={vm.totalQuestions} answeredCount={vm.answeredCount} />

            <ExamQuestion
              questionNumber={vm.currentIndex + 1}
              totalQuestions={vm.totalQuestions}
              prompt={vm.currentQuestion.prompt}
            />

            <ExamHelps
              questionId={vm.currentQuestion.id}
              help1Md={vm.currentQuestion.help1Md}
              help2Md={vm.currentQuestion.help2Md}
              onToggleAid={(k) => vm.toggleAid(k)}
              isAidVisible={vm.isAidVisible}
            />

            <ExamOptions
              options={vm.currentQuestion.choices}
              selectedOptionId={vm.selectedOptionId ?? null}
              onSelect={vm.handleSelectOption}
              disabled={vm.loading || vm.timeOver}
            />
          </div>
        </div>
      </section>

      {/* Footer fijo */}
      <footer className="flex-shrink-0 border-t border-border bg-white shadow-lg">
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
            disabled={vm.timeOver}
          />
        </div>
      </footer>
    </main>
  );
}
