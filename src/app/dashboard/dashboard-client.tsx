"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDashboardViewModel, type DashboardData } from "@/view-models/dashboard/use-dashboard-vm";

function getAcademicProgramName(program: string): string {
  const programs: Record<string, string> = {
    "ingenieria": "Facultad de Ingeniería",
    "derecho": "Facultad de Derecho",
    "administracion": "Administración de Empresas",
    "economia": "Economía",
    "ciencias": "Ciencias Básicas",
  };
  return programs[program] || program;
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, joinedDate, loading, handleLogout } = useDashboardViewModel(initialData);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-secondary px-6 py-10 text-foreground lg:px-16">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary px-6 py-10 text-primary-foreground lg:flex-row lg:items-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em]">Panel principal</p>
          <h1 className="text-3xl font-semibold">Hola, {user.fullName || user.email}</h1>
          <p className="text-sm text-primary-foreground/80">
            {user.academicProgram ? `${getAcademicProgramName(user.academicProgram)} • ` : ""}
            Rol: {user.role}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout} disabled={loading}>
          {loading ? "Cerrando..." : "Cerrar sesión"}
        </Button>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Estado de cuenta</h2>
          <p className="mt-2 text-xl font-bold text-foreground">Activo</p>
          <p className="mt-4 text-sm text-muted-foreground">Desde {joinedDate}</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Aceptación de términos</h2>
          <p className="mt-2 text-xl font-bold text-foreground">{user.acceptedTos ? "Confirmada" : "Pendiente"}</p>
          <p className="mt-4 text-sm text-muted-foreground">Puedes actualizar tus preferencias pronto.</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Próximos retos</h2>
          <p className="mt-2 text-xl font-bold text-foreground">Preparando contenido</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Recibirás notificaciones cuando publiquemos los nuevos desafíos.
          </p>
        </article>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">Exámenes Disponibles</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Tarjeta existente */}
          <Link
            href="/dashboard/exams/saberpro_exam"
            className="group block rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
              Prueba de Entrada – Salida
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Prueba diagnóstica de 35 preguntas para evaluar competencias en razonamiento cuantitativo.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>📊 35 preguntas</span>
              <span>⏱️ 45-60 minutos</span>
              <span>📝 Selección múltiple</span>
            </div>
            <Button className="mt-4 w-full">Iniciar Examen</Button>
          </Link>

          {/* NUEVA tarjeta: Prueba General */}
          <Link
            href="/dashboard/exams/prueba_general"
            className="group block rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
              Prueba General
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Evaluación completa con ayudas opcionales por pregunta y límite de 90 minutos.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>📊 60 preguntas</span>
              <span>⏱️ 90 minutos</span>
              <span>📝 Selección múltiple</span>
            </div>
            <Button className="mt-4 w-full">Iniciar Examen</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
