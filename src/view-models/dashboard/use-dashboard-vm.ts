"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

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
};

export function useDashboardViewModel(initialData: DashboardData) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

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
    loading,
    handleLogout,
  };
}