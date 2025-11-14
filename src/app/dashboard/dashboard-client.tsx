"use client";

import { DashboardData } from "@/types/dashboard";
import { useDashboardViewModel } from "@/view-models/dashboard/use-dashboard-vm";
import { DashboardHeader } from "./components/dashboard-header";
import { OverviewCards } from "./components/overview-cards";
import { TrainingPlanPanel } from "./components/training-plan-panel";
import { RoutesSection } from "./components/routes-section";

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, joinedDate, activeExam, entry, training, exit, loading, handleLogout } =
    useDashboardViewModel(initialData);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-secondary px-6 py-10 text-foreground lg:px-16">
      <DashboardHeader user={user} joinedDate={joinedDate} loading={loading} onLogout={handleLogout} />
      <OverviewCards user={user} joinedDate={joinedDate} exit={exit} />
      {training.trainingPlan && <TrainingPlanPanel trainingPlan={training.trainingPlan} />}
      <RoutesSection activeExam={activeExam} entry={entry} training={training} exit={exit} />
    </main>
  );
}
