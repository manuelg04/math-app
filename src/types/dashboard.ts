export type TrainingPlanSummary = {
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

export type DashboardUser = {
  email: string;
  role: string;
  createdAt: Date;
  acceptedTos: boolean;
  fullName: string | null;
  academicProgram: string | null;
  profilePhoto: string | null;
} | null;

export type ActiveExam = {
  attemptId: string;
  attemptKind: string;
  examId: string;
  examSlug: string;
  examTitle: string;
} | null;

export type ExamStatusEntry = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type ExamStatusTraining = "LOCKED" | "READY" | "IN_PROGRESS";
export type ExamStatusExit = "LOCKED" | "READY" | "IN_PROGRESS" | "COMPLETED";

export type EntryExamSummary = {
  slug: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  status: ExamStatusEntry;
  attemptId: string | null;
};

export type TrainingExamSummary = {
  slug: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  status: ExamStatusTraining;
  attemptId: string | null;
  trainingPlan: TrainingPlanSummary | null;
};

export type ExitExamSummary = {
  slug: string;
  title: string;
  description: string;
  status: ExamStatusExit;
  attemptId: string | null;
  progress: {
    answeredCount: number;
    minRequiredToUnlockExit: number;
    remainingToUnlockExit: number;
    unlocked: boolean;
  } | null;
};

export type DashboardData = {
  user: DashboardUser;
  joinedDate: string;
  activeExam: ActiveExam;
  entry: EntryExamSummary;
  training: TrainingExamSummary;
  exit: ExitExamSummary;
};
