import Link from "next/link";
import { Brand } from "@/components/brand";
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Compass,
  BookOpen,
} from "lucide-react";
export default function Page() {
  return (
    <main id="main" className="landing">
      <nav className="landing-nav">
        <Brand />
        <Link href="/login">
          Iniciar sesión <ArrowUpRight size={16} />
        </Link>
      </nav>
      <section className="landing-hero">
        <span className="eyebrow">TU ESPACIO DE RAZONAMIENTO CUANTITATIVO</span>
        <h1>
          Las respuestas importan.
          <br />
          <em>Entenderlas, aún más.</em>
        </h1>
        <p>
          Descubre tus fortalezas, practica con un plan personal
          <br className="desktop-only" /> y dale sentido a cada paso de tu
          aprendizaje.
        </p>
        <div className="hero-actions">
          <Link className="button-link" href="/registro">
            Empieza tu recorrido <ArrowRight size={19} />
          </Link>
          <Link href="/login" className="quiet-link">
            Ya tengo una cuenta
          </Link>
        </div>
        <div className="hero-caption">
          <span className="status-dot" />A tu ritmo. Con una ruta clara.
        </div>
      </section>
      <section className="landing-journey">
        {[
          {
            Icon: Compass,
            n: "01",
            title: "Encuentra tu punto de partida",
            text: "Una evaluación inicial para conocer tus habilidades.",
          },
          {
            Icon: BookOpen,
            n: "02",
            title: "Aprende haciendo",
            text: "Preguntas y ayudas adaptadas a tu plan de entrenamiento.",
          },
          {
            Icon: ChartNoAxesCombined,
            n: "03",
            title: "Mira lo que has logrado",
            text: "Compara tus resultados y reconoce tu progreso.",
          },
        ].map(({ Icon, n, title, text }) => (
          <article key={n}>
            <div>
              <Icon size={24} />
              <span>{n}</span>
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <footer className="landing-footer">
        <Brand />
        <span>Aprende a razonar. Avanza con confianza.</span>
      </footer>
    </main>
  );
}
