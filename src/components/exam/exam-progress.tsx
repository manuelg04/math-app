"use client";

type ExamProgressProps = {
  totalQuestions: number;
  answeredCount: number;
};

export function ExamProgress({ totalQuestions, answeredCount }: ExamProgressProps) {
  const percentage = (answeredCount / totalQuestions) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Progreso</span>
        <span className="text-muted-foreground">
          {answeredCount} de {totalQuestions} respondidas
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
