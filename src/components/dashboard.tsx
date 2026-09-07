"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Compass,
  BookOpen,
  ChartNoAxesCombined,
  X,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { AppShell } from "./app-shell";
import { Loading } from "./loading";
import { Button } from "./ui/button";
import { message } from "@/lib/errors";
const names = {
  ENTRY: "Prueba de entrada",
  TRAINING: "Entrenamiento",
  EXIT: "Prueba de salida",
};
export function Dashboard() {
  const p = useQuery(api.profiles.me);
  return (
    <AppShell>
      {p === undefined ? (
        <Loading />
      ) : !p?.onboarded ? (
        <main id="main" className="workspace">
          <h1>Bienvenido a RQ+</h1>
          <Link className="button-link" href="/onboarding">
            Completar mi perfil <ArrowRight size={18} />
          </Link>
        </main>
      ) : (
        <Overview name={p.name} />
      )}
    </AppShell>
  );
}
function Overview({ name }: { name: string }) {
  const data = useQuery(api.exams.dashboard);
  const start = useMutation(api.exams.start);
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [preflight, setPreflight] = useState<"ENTRY" | "EXIT" | null>(null);
  const starting = useRef(false);
  if (!data) return <Loading />;
  const { active, entry, exit, plan } = data;
  const entryDone = entry && entry.state !== "IN_PROGRESS";
  const exitReady = !!plan && plan.answered >= plan.minimum;
  async function begin(kind: "ENTRY" | "TRAINING" | "EXIT") {
    if (starting.current) return;
    starting.current = true;
    setBusy(kind);
    setError("");
    try {
      const id = await start({ kind });
      router.push(`/dashboard/exams/${id}`);
    } catch (e) {
      starting.current = false;
      setError(message(e));
      setBusy("");
    }
  }
  const steps = [
    {
      kind: "ENTRY" as const,
      Icon: Compass,
      title: "Encuentra tu punto de partida",
      description:
        "35 preguntas para conocer tus fortalezas y construir tu plan.",
      meta: "60 minutos · Sin ayudas",
      enabled: !entry,
      done: !!entryDone,
      result: entry,
    },
    {
      kind: "TRAINING" as const,
      Icon: BookOpen,
      title: "Practica con intención",
      description: plan
        ? `Tu plan ${plan.code} reúne ${plan.total} preguntas. Completa al menos ${plan.minimum} para avanzar.`
        : "Un recorrido que se adapta a los resultados de tu primera prueba.",
      meta: "A tu ritmo · Con ayudas",
      enabled: !!plan,
      done: false,
      result: null,
    },
    {
      kind: "EXIT" as const,
      Icon: ChartNoAxesCombined,
      title: "Reconoce tu avance",
      description:
        "Vuelve a poner a prueba tus habilidades y compara tu progreso.",
      meta: "60 minutos · Sin ayudas",
      enabled: exitReady && !exit,
      done: !!exit && exit.state !== "IN_PROGRESS",
      result: exit,
    },
  ];
  return (
    <main id="main" className="workspace">
      <header className="page-top">
        <span className="eyebrow">MI RECORRIDO</span>
        <span className="term-label">Razonamiento cuantitativo</span>
      </header>
      <h1>
        Hola, {name.split(" ")[0]}.<br />
        <em>Vamos paso a paso.</em>
      </h1>
      <p className="page-intro">
        Cada pregunta es una oportunidad para pensar diferente.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!data.catalogReady && (
        <p className="form-error">
          Estamos preparando el catálogo de ejercicios. Vuelve en un momento.
        </p>
      )}
      {active && (
        <section className="resume-banner">
          <div>
            <span className="eyebrow light">TU SESIÓN SIGUE AQUÍ</span>
            <h2>{names[active.kind]}</h2>
            <p>
              {active.answered} de {active.questionIds.length} preguntas
              respondidas. Continúa con tus respuestas guardadas.
            </p>
          </div>
          <Link
            className="button-link light-button"
            href={`/dashboard/exams/${active.id}`}
          >
            Continuar <ArrowRight size={18} />
          </Link>
        </section>
      )}
      <div className="section-heading">
        <h2>Tu ruta de aprendizaje</h2>
        <span>3 etapas, un propósito</span>
      </div>
      <section className="route-grid">
        {steps.map(
          (
            { kind, Icon, title, description, meta, enabled, done, result },
            i,
          ) => (
            <article
              className={`route-card ${enabled ? "available" : ""}`}
              key={kind}
            >
              <div className="route-top">
                <Icon size={24} />
                <span>0{i + 1}</span>
              </div>
              <div className="route-state">
                {done ? (
                  <>
                    <Check size={14} />
                    Completada
                  </>
                ) : enabled ? (
                  "Disponible"
                ) : (
                  <>
                    <LockKeyhole size={13} />
                    Por desbloquear
                  </>
                )}
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>{meta}</small>
              {done && result ? (
                <Link
                  className="route-action"
                  href={`/dashboard/exams/${result.id}`}
                >
                  Ver resultados <ArrowRight size={17} />
                </Link>
              ) : (
                <Button
                  disabled={
                    !enabled || !!active || !!busy || !data.catalogReady
                  }
                  onClick={() => {
                    setError("");
                    if (kind === "TRAINING") void begin(kind);
                    else setPreflight(kind);
                  }}
                >
                  {busy === kind
                    ? "Abriendo…"
                    : kind === "TRAINING"
                      ? "Ir a practicar"
                      : "Comenzar prueba"}
                  <ArrowRight size={17} />
                </Button>
              )}
            </article>
          ),
        )}
      </section>
      <Dialog.Root
        open={preflight !== null}
        onOpenChange={(open) => {
          if (!open && !starting.current) setPreflight(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>
              {preflight === "EXIT" ? "Prueba de salida" : "Prueba de entrada"}
            </Dialog.Title>
            <Dialog.Description>
              Busca un lugar tranquilo. El tiempo comienza cuando confirmes que
              quieres iniciar.
            </Dialog.Description>
            <ul className="assessment-instructions">
              <li>35 preguntas · 60 minutos · Un solo intento.</li>
              <li>
                El reloj sigue corriendo aunque cierres la página o salgas.
              </li>
              <li>
                Puedes revisar y cambiar tus respuestas antes de finalizar.
              </li>
              <li>
                Cada respuesta se guarda automáticamente. Comprueba que diga
                «Guardado» antes de salir.
              </li>
              <li>
                No hay ayudas durante la prueba. Las preguntas sin responder
                cuentan como incorrectas.
              </li>
              <li>
                Al agotarse el tiempo, la prueba se finaliza automáticamente.
              </li>
            </ul>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={!!busy}>
                  Ahora no
                </Button>
              </Dialog.Close>
              <Button
                disabled={!!busy || !!active}
                onClick={() => {
                  if (preflight) void begin(preflight);
                }}
              >
                {busy ? "Abriendo…" : "Entendido, comenzar"}
              </Button>
            </div>
            <Dialog.Close
              className="dialog-close"
              aria-label="Cerrar"
              disabled={!!busy}
            >
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {plan && (
        <section className="plan-panel">
          <div>
            <span className="eyebrow">PLAN {plan.code}</span>
            <h2>Tu constancia cuenta.</h2>
            <p>{plan.reason}</p>
          </div>
          <div className="plan-progress">
            <strong>
              {plan.answered}
              <span> / {plan.minimum}</span>
            </strong>
            <p>preguntas para desbloquear la salida</p>
            <progress
              value={Math.min(plan.answered, plan.minimum)}
              max={plan.minimum}
            />
            <small>
              {exit?.state && exit.state !== "IN_PROGRESS"
                ? "Recorrido completado. Puedes seguir practicando."
                : exitReady
                  ? "Ya puedes realizar tu prueba de salida."
                  : `Te faltan ${plan.minimum - plan.answered} preguntas diferentes.`}
            </small>
          </div>
        </section>
      )}
      {entryDone && (
        <section className="surface result-summary">
          <h2>Tu punto de partida</h2>
          <div className="competency-grid">
            {entry.categories.map((c) => (
              <div key={c.name}>
                <span>{c.name}</span>
                <strong>
                  {c.correct}
                  <small> / {c.total}</small>
                </strong>
                <progress value={c.correct} max={c.total} />
                <small>
                  {
                    {
                      LOW: "Por fortalecer",
                      MEDIUM: "En desarrollo",
                      HIGH: "Fortaleza",
                    }[c.level]
                  }
                </small>
              </div>
            ))}
          </div>
        </section>
      )}
      {entryDone && exit && exit.state !== "IN_PROGRESS" && (
        <section className="surface comparison">
          <h2>Así ha cambiado tu desempeño</h2>
          <p className="muted">
            Respuestas correctas por competencia, antes y después de practicar.
          </p>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Cambio</th>
                </tr>
              </thead>
              <tbody>
                {entry.categories.map((c, i) => {
                  const end = exit.categories[i];
                  const difference = (end?.correct ?? 0) - c.correct;
                  return (
                    <tr key={c.name}>
                      <th>{c.name}</th>
                      <td>
                        {c.correct} / {c.total}
                      </td>
                      <td>
                        {end?.correct ?? 0} / {end?.total ?? c.total}
                      </td>
                      <td>
                        {difference > 0 ? "+" : ""}
                        {difference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {data.recent.some((a) => a.state !== "IN_PROGRESS") && (
        <section className="history">
          <h2>Tu actividad reciente</h2>
          {data.recent
            .filter((a) => a.state !== "IN_PROGRESS")
            .map((a) => (
              <Link key={a.id} href={`/dashboard/exams/${a.id}`}>
                <span>
                  {names[a.kind]}
                  <small>
                    {new Date(a.finishedAt ?? a.startedAt).toLocaleDateString(
                      "es-CO",
                    )}
                  </small>
                </span>
                <strong>
                  {Math.round(a.score ?? 0)}% <ArrowRight size={16} />
                </strong>
              </Link>
            ))}
        </section>
      )}
    </main>
  );
}
