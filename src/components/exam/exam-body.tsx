"use client";

import { ExamProgress } from "./exam-progress";
import { ExamQuestion } from "./exam-question";
import { ExamHelps } from "./exam-helps";
import { ExamOptions } from "./exam-options";

type Question = {
  id: string;
  prompt: string;
  choices: Array<{
    id: string;
    label: string;
    text: string;
    imageUrl?: string | null;
  }>;
  help1Md?: string | null;
  help2Md?: string | null;
};

type Props = {
  currentQuestion: Question;
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  showOptionalHelps: boolean;
  selectedOptionId: string | null;
  loading: boolean;
  timeOver: boolean;
  onSelectOption: (id: string) => void;
  onToggleAid: (key: "AID1" | "AID2" | "AI_ASSIST") => void;
  isAidVisible: (questionId: string, key: "AID1" | "AID2" | "AI_ASSIST") => boolean;
  aiAid: {
    available: boolean;
    disabledReason: string | null;
    loading: boolean;
    hint: string | null;
    error: string | null;
    alreadyGenerated?: boolean;
  };
};

export function ExamBody({
  currentQuestion,
  currentIndex,
  totalQuestions,
  answeredCount,
  showOptionalHelps,
  selectedOptionId,
  loading,
  timeOver,
  onSelectOption,
  onToggleAid,
  isAidVisible,
  aiAid,
}: Props) {
  return (
    <section className="flex-1 min-h-0 overflow-y-auto overscroll-none">
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <ExamProgress totalQuestions={totalQuestions} answeredCount={answeredCount} />

          <ExamQuestion questionNumber={currentIndex + 1} totalQuestions={totalQuestions} prompt={currentQuestion.prompt} />

          {showOptionalHelps && (
            <ExamHelps
              questionId={currentQuestion.id}
              help1Md={currentQuestion.help1Md}
              help2Md={currentQuestion.help2Md}
              onToggleAid={onToggleAid}
              isAidVisible={isAidVisible}
              aiAid={aiAid}
            />
          )}

          <ExamOptions
            options={currentQuestion.choices}
            selectedOptionId={selectedOptionId ?? null}
            onSelect={onSelectOption}
            disabled={loading || timeOver}
          />
        </div>
      </div>
    </section>
  );
}
