"use client";

import { Button } from "@/components/ui/button";
import { DashboardUser } from "@/types/dashboard";

type DashboardHeaderProps = {
  user: NonNullable<DashboardUser>;
  joinedDate: string;
  loading: boolean;
  onLogout: () => void;
};

function getAcademicProgramName(program: string): string {
  const programs: Record<string, string> = {
    ingenieria: "Facultad de Ingeniería",
    derecho: "Facultad de Derecho",
    administracion: "Administración de Empresas",
    economia: "Economía",
    ciencias: "Ciencias Básicas",
  };
  return programs[program] || program;
}

export function DashboardHeader({ user, joinedDate, loading, onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary px-6 py-10 text-primary-foreground lg:flex-row lg:items-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.3em]">Panel principal</p>
        <h1 className="text-3xl font-semibold">Hola, {user.fullName || user.email}</h1>
        <p className="text-sm text-primary-foreground/80">
          {user.academicProgram ? `${getAcademicProgramName(user.academicProgram)} • ` : ""}
          Rol: {user.role}
        </p>
        <p className="text-xs text-primary-foreground/70">Desde {joinedDate}</p>
      </div>
      <Button variant="secondary" onClick={onLogout} disabled={loading}>
        {loading ? "Cerrando..." : "Cerrar sesión"}
      </Button>
    </header>
  );
}
