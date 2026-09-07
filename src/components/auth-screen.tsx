"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Check, ArrowUpRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    try {
      const result = register
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get("name")).trim(),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          register
            ? "No pudimos crear la cuenta. Revisa los datos o inicia sesión si ya tienes una."
            : "Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.",
        );
        setBusy(false);
        return;
      }
      window.location.assign(register ? "/onboarding" : "/dashboard");
    } catch {
      setError("No pudimos conectar. Intenta nuevamente.");
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <aside className="auth-story">
        <Brand light />
        <div className="story-content">
          <span className="eyebrow light">TU SIGUIENTE PASO EMPIEZA AQUÍ</span>
          <h1>
            Más que números.
            <br />
            <em>
              Una nueva forma
              <br />
              de pensar.
            </em>
          </h1>
          <p>
            Entiende, conecta y resuelve. Construye tus habilidades con una ruta
            de aprendizaje hecha para ti.
          </p>
          <div className="story-steps">
            {[
              "Descubre tu punto de partida",
              "Practica con un plan personal",
              "Reconoce cuánto has avanzado",
            ].map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                {s}
                <ArrowUpRight size={17} />
              </div>
            ))}
          </div>
        </div>
        <footer>
          RQ+ <span>Aprende a tu ritmo. Avanza con propósito.</span>
        </footer>
      </aside>
      <section className="auth-form-panel">
        <div className="auth-top">
          <Link href="/">Volver al inicio</Link>
          <span>
            {register ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
            <Link href={register ? "/login" : "/registro"}>
              {register ? "Inicia sesión" : "Crea tu cuenta"}{" "}
              <ArrowUpRight size={14} />
            </Link>
          </span>
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {register ? "EMPECEMOS" : "QUÉ BUENO VERTE"}
          </span>
          <h2>
            {register
              ? "Tu progreso empieza hoy."
              : "Continúa donde lo dejaste."}
          </h2>
          <p className="muted">
            {register
              ? "Crea tu cuenta y descubre tu punto de partida."
              : "Ingresa a tu espacio de aprendizaje."}
          </p>
          <form onSubmit={submit} className="form-stack">
            {register && (
              <div className="field">
                <Label htmlFor="name">Tu nombre</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="¿Cómo te llamas?"
                />
              </div>
            )}
            <div className="field">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="password">Contraseña</Label>
              <div className="password-field">
                <Input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={register ? 10 : undefined}
                  maxLength={128}
                  required
                  placeholder={
                    register ? "Al menos 10 caracteres" : "Tu contraseña"
                  }
                  aria-describedby={register ? "password-hint" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={
                    show ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {register && (
                <small id="password-hint" className="muted">
                  Usa 10 caracteres o más. Puedes usar una frase fácil de
                  recordar.
                </small>
              )}
            </div>
            {!register && (
              <Link className="recovery-link" href="/recuperar">
                ¿Olvidaste tu contraseña?
              </Link>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} className="primary-button" type="submit">
              {busy
                ? "Un momento…"
                : register
                  ? "Crear mi cuenta"
                  : "Iniciar sesión"}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-note">
            <Check size={15} />
            {register
              ? "Sin suscripciones ni datos de pago."
              : "Tu progreso se guarda en tu cuenta."}
          </p>
        </div>
        <div className="auth-bottom">
          RQ+ · Razonamiento cuantitativo <span>Un paso a la vez.</span>
        </div>
      </section>
    </main>
  );
}
