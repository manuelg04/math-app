"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Clock3,
  X,
  BookOpen,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { message } from "@/lib/errors";
import { Brand } from "./brand";
import { Loading } from "./loading";
import { Button } from "./ui/button";
const MathMarkdown = dynamic(() => import("./math-markdown"), {
  loading: () => <Loading label="Cargando contenido…" />,
});
type Session = FunctionReturnType<typeof api.exams.session>;
type Pending = {
  id: Id<"attempts">;
  questionId: Id<"questions">;
  selected: string;
  expectedRevision: number;
  flagged: boolean;
};
const names = {
  ENTRY: "Prueba de entrada",
  TRAINING: "Entrenamiento",
  EXIT: "Prueba de salida",
};
export function Exam({ id }: { id: string }) {
  const p = useQuery(api.profiles.me);
  const valid = /^[a-z0-9]{20,40}$/.test(id);
  return !valid ? (
    <main id="main" className="simple-page">
      <h1>Evaluación no encontrada</h1>
      <Link href="/dashboard">Volver a mi recorrido</Link>
    </main>
  ) : !p ? (
    <Loading />
  ) : (
    <ExamSession id={id as Id<"attempts">} account={p.email} />
  );
}
function ExamSession({ id, account }: { id: Id<"attempts">; account: string }) {
  const session = useQuery(api.exams.session, { id });
  if (!session) return <Loading />;
  return session.attempt.state === "IN_PROGRESS" ? (
    <Workspace key={id} session={session} account={account} />
  ) : (
    <Results session={session} />
  );
}
function Workspace({
  session,
  account,
}: {
  session: Session;
  account: string;
}) {
  const { attempt, answers } = session;
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [help, setHelp] = useState(false);
  const lock = useRef(false);
  const questionMain = useRef<HTMLElement>(null);
  const reviewJump = useRef(false);
  const save = useMutation(api.exams.answer);
  const submit = useMutation(api.exams.submit);
  const questionId = attempt.questionIds[index];
  const question = useQuery(api.exams.question, { id: attempt.id, questionId });
  const answer = answers.find((a) => a.questionId === questionId);
  const storageKey = `rq-answer-v1:${account}:${attempt.id}`;
  const positionKey = `rq-position-v1:${account}:${attempt.id}`;
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(positionKey);
      const savedIndex = attempt.questionIds.findIndex((id) => id === savedId);
      if (savedIndex >= 0) setIndex(savedIndex);
    } catch {}
  }, [positionKey, attempt.questionIds]);
  function navigate(nextIndex: number) {
    if (lock.current || pending || finishing) return;
    setIndex(nextIndex);
    setHelp(false);
    try {
      localStorage.setItem(positionKey, attempt.questionIds[nextIndex]);
    } catch {}
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.id === attempt.id &&
          typeof parsed.questionId === "string" &&
          typeof parsed.selected === "string" &&
          typeof parsed.expectedRevision === "number" &&
          typeof parsed.flagged === "boolean"
        ) {
          setPending(parsed);
          setError(
            "Hay una respuesta pendiente de una sesión anterior. Reintenta guardarla antes de continuar.",
          );
        }
      }
    } catch {
      setError(
        "El navegador no permite conservar respuestas pendientes. Mantén esta página abierta hasta ver Guardado.",
      );
    }
  }, [storageKey, attempt.id]);
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  useEffect(() => {
    if (!pending || busy) return;
    const remote = answers.find((a) => a.questionId === pending.questionId);
    if (
      remote &&
      remote.selected === pending.selected &&
      remote.flagged === pending.flagged &&
      remote.revision > pending.expectedRevision
    ) {
      setPending(null);
      setError("");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [answers, pending, busy, storageKey]);
  async function write(data: Pending) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setPending(data);
    setError("");
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
    try {
      await save(data);
      setPending(null);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function choose(selected: string, flagged = answer?.flagged ?? false) {
    void write({
      id: attempt.id,
      questionId,
      selected,
      flagged,
      expectedRevision: answer?.revision ?? 0,
    });
  }
  async function finish() {
    if (pending || busy || lock.current) return;
    setFinishing(true);
    setError("");
    try {
      await submit({ id: attempt.id });
    } catch (e) {
      setError(message(e));
      setFinishing(false);
    }
  }
  function discard() {
    setPending(null);
    setError("");
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  const selected =
    pending?.questionId === questionId ? pending.selected : answer?.selected;
  const blocked = busy || !!pending || finishing;
  const answersById = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  const reviewGroups = [
    {
      title: "Sin responder",
      questions: attempt.questionIds.flatMap((id, index) =>
        !answersById.has(id) ? [index] : [],
      ),
    },
    {
      title: "Marcadas para revisar",
      questions: attempt.questionIds.flatMap((id, index) =>
        answersById.get(id)?.flagged ? [index] : [],
      ),
    },
  ];
  return (
    <div className="exam-page">
      <header className="exam-header">
        <Brand />
        <span>{names[attempt.kind]}</span>
        <div>
          {attempt.deadlineAt ? (
            <Timer
              deadline={attempt.deadlineAt}
              serverTime={session.serverTime}
            />
          ) : (
            <span className="timer">
              <Clock3 size={16} />
              Sin límite de tiempo
            </span>
          )}
          <Link href="/dashboard" className="exam-exit">
            Guardar y salir
          </Link>
        </div>
      </header>
      <div className="exam-layout">
        <aside className="question-sidebar">
          <Link href="/dashboard" className="back-link">
            <ArrowLeft size={15} />
            Mi recorrido
          </Link>
          <span className="eyebrow">TU PROGRESO</span>
          <h2>
            {answers.length}
            <span> / {attempt.questionIds.length}</span>
          </h2>
          <p>preguntas respondidas</p>
          <progress value={answers.length} max={attempt.questionIds.length} />
          <div className="question-map" aria-label="Navegación de preguntas">
            {attempt.questionIds.map((q, i) => {
              const a = answers.find((a) => a.questionId === q);
              return (
                <button
                  key={q}
                  disabled={blocked}
                  onClick={() => navigate(i)}
                  aria-label={`Pregunta ${i + 1}${a ? ", respondida" : ""}${a?.flagged ? ", marcada para revisar" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  className={`${a ? "answered" : ""} ${a?.flagged ? "flagged" : ""}`}
                >
                  {i + 1}
                  {a?.flagged && <span />}
                </button>
              );
            })}
          </div>
          <div className="map-legend">
            <span>
              <i />
              Respondida
            </span>
            <span>
              <i className="flag-dot" />
              Para revisar
            </span>
          </div>
          <p className="sidebar-help">
            Puedes volver a cualquier pregunta antes de finalizar.
          </p>
        </aside>
        <main
          id="main"
          className="question-main"
          ref={questionMain}
          tabIndex={-1}
        >
          <div className="question-topline">
            <span className="eyebrow">
              PREGUNTA {index + 1} DE {attempt.questionIds.length}
            </span>
            <span
              className={`save-status ${pending ? "pending" : ""}`}
              role="status"
            >
              {busy ? (
                "Guardando…"
              ) : pending ? (
                "Pendiente de guardar"
              ) : (
                <>
                  <Check size={14} />
                  Guardado
                </>
              )}
            </span>
          </div>
          {error && (
            <div className="form-error" role="alert">
              <p>{error}</p>
              {pending && !busy && (
                <div className="inline-actions">
                  <Button variant="secondary" onClick={() => write(pending)}>
                    Reintentar
                  </Button>
                  <Button variant="ghost" onClick={discard}>
                    Descartar cambio pendiente
                  </Button>
                </div>
              )}
            </div>
          )}
          {question ? (
            <>
              <span className="question-category">{question.competency}</span>
              <article className="question-prompt">
                <MathMarkdown>{question.prompt}</MathMarkdown>
              </article>
              <fieldset className="choices" disabled={blocked}>
                <legend>Selecciona una respuesta</legend>
                {question.choices.map((c) => (
                  <label
                    key={c.label}
                    className={`choice ${selected === c.label ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={c.label}
                      checked={selected === c.label}
                      onChange={() => choose(c.label)}
                    />
                    <span className="choice-letter">{c.label}</span>
                    <MathMarkdown>{c.text}</MathMarkdown>
                    {selected === c.label && <Check size={18} />}
                  </label>
                ))}
              </fieldset>
              <div className="question-tools">
                <button
                  disabled={!answer || blocked}
                  className={answer?.flagged ? "flag-active" : ""}
                  onClick={() => choose(answer!.selected, !answer!.flagged)}
                >
                  <Flag size={16} />
                  {answer?.flagged
                    ? "Marcada para revisar"
                    : "Marcar para revisar"}
                </button>
                {attempt.kind === "TRAINING" && (
                  <button onClick={() => setHelp(!help)} aria-expanded={help}>
                    <BookOpen size={16} />
                    {help ? "Ocultar ayudas" : "Necesito una ayuda"}
                  </button>
                )}
              </div>
              {help && (
                <Help
                  key={questionId}
                  id={attempt.id}
                  questionId={questionId}
                />
              )}
            </>
          ) : (
            <Loading label="Cargando pregunta…" />
          )}
          <footer className="exam-footer">
            <Button
              variant="secondary"
              disabled={index === 0 || blocked}
              onClick={() => navigate(index - 1)}
            >
              <ArrowLeft size={17} />
              Anterior
            </Button>
            <span>
              {index + 1} / {attempt.questionIds.length}
            </span>
            {index < attempt.questionIds.length - 1 ? (
              <Button disabled={blocked} onClick={() => navigate(index + 1)}>
                Siguiente
                <ArrowRight size={17} />
              </Button>
            ) : (
              <Button disabled={blocked} onClick={() => setReview(true)}>
                Revisar y finalizar
                <Check size={17} />
              </Button>
            )}
          </footer>
          <button
            className="finish-quiet"
            disabled={blocked}
            onClick={() => setReview(true)}
          >
            Revisar y finalizar{" "}
            {attempt.kind === "TRAINING" ? "práctica" : "prueba"}
          </button>
        </main>
      </div>
      <Dialog.Root open={review} onOpenChange={setReview}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onCloseAutoFocus={(event) => {
              if (reviewJump.current) {
                event.preventDefault();
                reviewJump.current = false;
                questionMain.current?.focus({ preventScroll: true });
                questionMain.current?.scrollIntoView({ block: "start" });
              }
            }}
          >
            <Dialog.Title>Antes de finalizar</Dialog.Title>
            <Dialog.Description>
              Has respondido {answers.length} de {attempt.questionIds.length}{" "}
              preguntas.{" "}
              {attempt.questionIds.length - answers.length > 0
                ? "Las preguntas sin responder contarán como incorrectas."
                : "Todas tus respuestas están guardadas."}
            </Dialog.Description>
            <div className="review-groups">
              {reviewGroups.map(({ title, questions }) => (
                <section
                  className="review-group"
                  key={title}
                  aria-label={title}
                >
                  <h3>
                    {title} <span>({questions.length})</span>
                  </h3>
                  {questions.length ? (
                    <div className="review-questions">
                      {questions.map((i) => (
                        <button
                          key={attempt.questionIds[i]}
                          disabled={blocked}
                          aria-label={`Ir a la pregunta ${i + 1}`}
                          onClick={() => {
                            navigate(i);
                            reviewJump.current = true;
                            setReview(false);
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>Ninguna.</p>
                  )}
                </section>
              ))}
            </div>
            <p className="muted">
              Después de finalizar no podrás cambiar las respuestas de esta
              sesión.
            </p>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={finishing}>
                  Seguir revisando
                </Button>
              </Dialog.Close>
              <Button disabled={blocked} onClick={finish}>
                {finishing ? "Finalizando…" : "Finalizar y ver resultados"}
              </Button>
            </div>
            <Dialog.Close className="dialog-close" aria-label="Cerrar">
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
function Timer({
  deadline,
  serverTime,
}: {
  deadline: number;
  serverTime: number;
}) {
  const [now, setNow] = useState(serverTime);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(
      () => setNow(serverTime + performance.now() - start),
      1000,
    );
    return () => clearInterval(timer);
  }, [serverTime]);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <span
      className={`timer ${seconds < 300 ? "urgent" : ""}`}
      aria-label="Tiempo restante"
    >
      <Clock3 size={16} />
      {Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0")}
      :{(seconds % 60).toString().padStart(2, "0")}
    </span>
  );
}
function Help({
  id,
  questionId,
}: {
  id: Id<"attempts">;
  questionId: Id<"questions">;
}) {
  const [key, setKey] = useState<"concept" | "steps" | "ai">("concept");
  const status = useQuery(api.aids.status, { id, questionId, key });
  const request = useMutation(api.aids.request);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(k: typeof key) {
    setKey(k);
    setError("");
    setBusy(true);
    try {
      await request({ id, questionId, key: k });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="help-panel">
      <h2>Un impulso para seguir</h2>
      <div className="help-tabs">
        {(
          [
            ["concept", "Concepto"],
            ["steps", "Paso a paso"],
            ["ai", "Ejemplo con IA"],
          ] as const
        ).map(([k, label]) => (
          <button
            aria-pressed={key === k}
            disabled={busy}
            key={k}
            onClick={() => load(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy || status?.state === "pending" ? (
        <Loading label="Preparando ayuda…" />
      ) : status?.text ? (
        <MathMarkdown>{status.text}</MathMarkdown>
      ) : (
        <p className="muted">
          {status?.error || "Selecciona una ayuda para consultar el contenido."}
        </p>
      )}
    </section>
  );
}
function Results({ session }: { session: Session }) {
  const { attempt } = session;
  return (
    <main id="main" className="results-page">
      <Brand />
      <span className="eyebrow">
        {names[attempt.kind]} ·{" "}
        {attempt.state === "EXPIRED" ? "TIEMPO FINALIZADO" : "COMPLETADA"}
      </span>
      <h1>
        Cada paso
        <br />
        <em>te lleva más lejos.</em>
      </h1>
      <div className="score-circle">
        <strong>
          {Math.round(attempt.score ?? 0)}
          <small>%</small>
        </strong>
        <span>respuestas correctas</span>
      </div>
      <p>
        {attempt.correct} correctas de {attempt.questionIds.length} preguntas ·{" "}
        {attempt.answered} respondidas
      </p>
      {attempt.categories.length > 0 && (
        <div className="competency-grid">
          {attempt.categories.map((c) => (
            <div key={c.name}>
              <span>{c.name}</span>
              <strong>
                {c.correct}
                <small> / {c.total}</small>
              </strong>
              <progress max={c.total} value={c.correct} />
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
      )}
      <p className="muted">
        {attempt.kind === "ENTRY"
          ? "Tu plan de entrenamiento ya está listo. Practica para fortalecer tus habilidades."
          : attempt.kind === "TRAINING"
            ? "Tu práctica cuenta. Regresa a tu recorrido para consultar tu progreso."
            : "Completaste tu recorrido. Consulta tus resultados en el inicio."}
      </p>
      <Link href="/dashboard" className="button-link">
        Volver a mi recorrido
        <ArrowRight size={18} />
      </Link>
    </main>
  );
}
