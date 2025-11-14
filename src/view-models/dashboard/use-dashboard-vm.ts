"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_REFRESH_FLAG } from "@/lib/constants";

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

type ExamStatusEntry = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
type ExamStatusTraining = "LOCKED" | "READY" | "IN_PROGRESS";
type ExamStatusExit = "LOCKED" | "READY" | "IN_PROGRESS" | "COMPLETED";

export type DashboardData = {
  user: {
    email: string;
    role: string;
    createdAt: Date;
    acceptedTos: boolean;
    fullName: string | null;
    academicProgram: string | null;
    profilePhoto: string | null;
  } | null;
  joinedDate: string;
  activeExam: {
    attemptId: string;
    attemptKind: string;
    examId: string;
    examSlug: string;
    examTitle: string;
  } | null;
  entry: {
    slug: string;
    title: string;
    description: string;
    questionCount: number;
    durationMinutes: number;
    status: ExamStatusEntry;
    attemptId: string | null;
  };
  training: {
    slug: string;
    title: string;
    description: string;
    questionCount: number;
    durationMinutes: number;
    status: ExamStatusTraining;
    attemptId: string | null;
    trainingPlan: TrainingPlanSummary | null;
  };
  exit: {
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
};

export function useDashboardViewModel(initialData: DashboardData) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const needsRefresh = window.sessionStorage.getItem(DASHBOARD_REFRESH_FLAG);
    if (!needsRefresh) return;
    window.sessionStorage.removeItem(DASHBOARD_REFRESH_FLAG);
    router.refresh();
  }, [router]);

  const handleLogout = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión");
      }
      toast({ variant: "success", description: "Sesión cerrada correctamente" });
      router.push("/login");
    } catch (error) {
      toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  return {
    user: initialData.user,
    joinedDate: initialData.joinedDate,
    activeExam: initialData.activeExam,
    entry: initialData.entry,
    training: initialData.training,
    exit: initialData.exit,
    loading,
    handleLogout,
  };
}
