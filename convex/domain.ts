export type Level = "LOW" | "MEDIUM" | "HIGH";
export function categoryLevel(points: number): Level {
  return points <= 4 ? "LOW" : points <= 8 ? "MEDIUM" : "HIGH";
}
export function grade(
  questions: Array<{ id: string; number: number; correct: string }>,
  answers: Array<{ questionId: string; selected: string }>,
  assessment: boolean,
) {
  const choices = new Map(answers.map((a) => [a.questionId, a.selected]));
  const correct = questions.filter(
    (q) => choices.get(q.id) === q.correct,
  ).length;
  const answered = questions.filter((q) => Boolean(choices.get(q.id))).length;
  const categories = assessment
    ? [
        { name: "Interpretación", start: 1, end: 12 },
        { name: "Formulación", start: 13, end: 23 },
        { name: "Argumentación", start: 24, end: 35 },
      ].map((c) => {
        const group = questions.filter(
          (q) => q.number >= c.start && q.number <= c.end,
        );
        const points = group.filter(
          (q) => choices.get(q.id) === q.correct,
        ).length;
        return {
          name: c.name,
          correct: points,
          total: group.length,
          level: categoryLevel(points),
        };
      })
    : [];
  return {
    correct,
    answered,
    score: questions.length ? (correct / questions.length) * 100 : 0,
    categories,
  };
}
export function canWrite(
  state: string,
  deadline: number | undefined,
  now: number,
) {
  return state === "IN_PROGRESS" && (deadline === undefined || now < deadline);
}
export function nextRevision(current: number | undefined, expected: number) {
  return (current ?? 0) === expected;
}
