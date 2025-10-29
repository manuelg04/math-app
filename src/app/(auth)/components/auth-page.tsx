import type { ReactNode } from "react";
import Image from "next/image";

interface AuthPageProps {
  title: string;
  subtitle: string;
  description?: string;
  children: ReactNode;
}

export function AuthPage({ title, subtitle, description, children }: AuthPageProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-secondary lg:grid-cols-2">
      <section className="relative hidden flex-col justify-center bg-primary px-12 text-primary-foreground lg:flex">
        <div className="absolute inset-6 rounded-3xl border border-white/30"></div>
        <div className="relative z-10 flex flex-col gap-6">
          <p className="text-2xl font-semibold uppercase tracking-[0.2em]">RQ+</p>
          <h1 className="text-4xl font-bold leading-snug lg:text-5xl">{title}</h1>
          <p className="max-w-md text-lg text-primary-foreground/80">{subtitle}</p>
          {description && (
            <p className="max-w-md text-base text-primary-foreground/70 leading-relaxed">{description}</p>
          )}
          <div className="mt-4">
            <Image
              src="/logo-lasalle.png"
              alt="Logo Lasalle"
              width={180}
              height={60}
              className="object-contain"
            />
          </div>
        </div>
      </section>
      <section className="flex min-h-screen w-full items-center justify-center px-6 py-16 lg:px-20">
        {children}
      </section>
    </main>
  );
}
