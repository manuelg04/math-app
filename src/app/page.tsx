import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary to-secondary/80 px-6 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-1 flex-col gap-8 text-center lg:text-left">
          <div className="space-y-6">
            <span className="inline-block rounded-full bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary">
              Math App
            </span>
            <h1 className="text-4xl font-bold leading-tight text-foreground lg:text-6xl">
              Domina las matemáticas con un acompañamiento inteligente
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground lg:mx-0 lg:text-xl">
              Practica, recibe retroalimentación inmediata y sigue un plan personalizado. Nuestra plataforma te acompaña paso a paso para alcanzar tus objetivos académicos.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border-2 border-border bg-white px-8 py-4 text-base font-semibold text-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              Ya tengo una cuenta
            </Link>
          </div>
        </div>
        <div className="flex flex-1 justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl lg:p-10">
            <h2 className="mb-8 text-2xl font-bold text-foreground">
              Ventajas de Math App
            </h2>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-base leading-relaxed text-muted-foreground">
                  Sesiones adaptativas y retos personalizados cada semana.
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-base leading-relaxed text-muted-foreground">
                  Seguimiento de progreso con métricas claras y comprensibles.
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-base leading-relaxed text-muted-foreground">
                  Comunidad y mentores listos para resolver tus dudas en vivo.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
