import type { ReactNode } from "react";

interface AuthPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthPage({ title, subtitle, children }: AuthPageProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-secondary lg:grid-cols-2">
      <section className="relative hidden flex-col justify-center bg-primary px-12 text-primary-foreground lg:flex">
        <div className="absolute inset-6 rounded-3xl border border-white/30"></div>
        <div className="relative z-10 flex flex-col gap-6">
          <p className="text-sm uppercase tracking-[0.3em]">Math App</p>
          <h1 className="text-4xl font-bold leading-snug lg:text-5xl">{title}</h1>
          <p className="max-w-md text-lg text-primary-foreground/80">{subtitle}</p>
        </div>
      </section>
      <section className="flex min-h-screen w-full items-center justify-center px-6 py-16 lg:px-20">
        {children}
      </section>
    </main>
  );
}
