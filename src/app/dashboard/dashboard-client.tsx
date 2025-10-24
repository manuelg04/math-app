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

type ExamCard = {
  slug: string;
  title: string;
  description: string;
  questionCount: string;
  duration: string;
};

const AVAILABLE_EXAMS: ExamCard[] = [
  {
    slug: "saberpro_exam",
    title: "Prueba de Entrada – Salida",
    description: "Prueba diagnóstica de 35 preguntas para evaluar competencias en razonamiento cuantitativo.",
    questionCount: "35 preguntas",
    duration: "60 minutos",
  },
  {
    slug: "prueba_general",
    title: "Prueba General",
    description: "Evaluación completa con ayudas opcionales por pregunta y límite de 90 minutos.",
    questionCount: "60 preguntas",
    duration: "90 minutos",
  },
];

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, joinedDate, activeExam, loading, handleLogout } = useDashboardViewModel(initialData);

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
        {activeExam && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">
              Tienes un examen en progreso: <span className="font-bold">{activeExam.examTitle}</span>
            </p>
            <p className="mt-1 text-amber-700">
              Continúa con tu examen activo o finalízalo antes de iniciar uno nuevo.
            </p>
          </div>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {AVAILABLE_EXAMS.map((exam) => {
            const isActive = activeExam?.examSlug === exam.slug;
            const isDisabled = activeExam && !isActive;

            return (
              <div
                key={exam.slug}
                className={`rounded-2xl border bg-white p-6 shadow-sm transition-all ${
                  isDisabled
                    ? "border-border opacity-60"
                    : "border-border hover:border-primary hover:shadow-md"
                }`}
              >
                <h3
                  className={`text-lg font-semibold ${
                    isDisabled ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {exam.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{exam.description}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>📊 {exam.questionCount}</span>
                  <span>⏱️ {exam.duration}</span>
                  <span>📝 Selección múltiple</span>
                </div>

                {isActive ? (
                  <Link href={`/dashboard/exams/${exam.slug}`} className="mt-4 block">
                    <Button className="w-full" variant="primary">
                      Continuar Examen
                    </Button>
                  </Link>
                ) : isDisabled ? (
                  <Button className="mt-4 w-full" disabled variant="secondary">
                    Finaliza tu examen activo primero
                  </Button>
                ) : (
                  <Link href={`/dashboard/exams/${exam.slug}`} className="mt-4 block">
                    <Button className="w-full">Iniciar Examen</Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
