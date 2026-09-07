"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="center-page">
      <section className="simple-panel">
        <h1>Hagamos una pausa.</h1>
        <p>
          No pudimos cargar esta página. Tus respuestas confirmadas siguen
          guardadas.
        </p>
        <button className="button-link" onClick={reset}>
          Intentar de nuevo
        </button>
        <Link href="/dashboard">Volver a mi espacio</Link>
      </section>
    </main>
  );
}
