"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useDashboardRefreshEffect } from "@/hooks/use-dashboard-refresh-flag";
import { DashboardData } from "@/types/dashboard";

export function useDashboardViewModel(initialData: DashboardData) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  useDashboardRefreshEffect(() => router.refresh());

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
