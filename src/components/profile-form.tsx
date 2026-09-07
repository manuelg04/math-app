"use client";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { academicPrograms } from "@/data/academic-programs";
import { message } from "@/lib/errors";
import { Loading } from "./loading";
import { AppShell } from "./app-shell";
import { Button } from "./ui/button";
export function ProfileForm({ onboarding = false }: { onboarding?: boolean }) {
  const p = useQuery(api.profiles.me);
  const complete = useMutation(api.profiles.complete);
  const upload = useAction(api.profiles.uploadPhoto);
  const password = useMutation(api.profiles.changePassword);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (p === undefined) return <Loading />;
  if (!p) return <p>Inicia sesión para continuar.</p>;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      await complete({
        name: String(f.get("name")),
        program: String(f.get("program")),
      });
      if (onboarding) router.replace("/dashboard");
      else setNotice("Perfil actualizado.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function photo(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Usa JPG, PNG o WebP de máximo 5 MB.");
      return;
    }
    setBusy(true);
    try {
      await upload({ bytes: await file.arrayBuffer(), contentType: file.type });
      setNotice("Foto actualizada.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function change(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("new") !== f.get("confirm")) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await password({
        currentPassword: String(f.get("current")),
        newPassword: String(f.get("new")),
      });
      setNotice("Contraseña actualizada. Las otras sesiones se cerraron.");
      form.reset();
    } catch {
      setError(
        "No pudimos cambiar la contraseña. Revisa la contraseña actual y usa al menos 10 caracteres.",
      );
    } finally {
      setBusy(false);
    }
  }
  const body = (
    <main id="main" className="workspace profile-page">
      <span className="eyebrow">
        {onboarding ? "ANTES DE EMPEZAR" : "TU CUENTA"}
      </span>
      <h1>{onboarding ? "Hagamos este espacio tuyo." : "Mi perfil"}</h1>
      <p className="muted">
        Tu programa nos ayuda a contextualizar tu aprendizaje.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success-note">
          {notice}
        </p>
      )}
      <section className="surface">
        <form className="form-stack" onSubmit={save}>
          <div className="field">
            <label htmlFor="profile-name">Nombre</label>
            <input
              id="profile-name"
              name="name"
              defaultValue={p.name}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="program">Programa académico</label>
            <select
              id="program"
              name="program"
              defaultValue={p.program}
              required
            >
              <option value="">Selecciona tu programa</option>
              {academicPrograms.map((f) => (
                <optgroup label={f.name} key={f.name}>
                  {f.programs.map((p) => (
                    <option key={p.value} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Correo electrónico</label>
            <p>{p.email}</p>
          </div>
          <Button type="submit" disabled={busy}>
            {busy
              ? "Guardando…"
              : onboarding
                ? "Ir a mi recorrido"
                : "Guardar cambios"}
          </Button>
        </form>
      </section>
      {!onboarding && (
        <>
          <section className="surface">
            <h2>Foto de perfil</h2>
            <div className="photo-row">
              {p.photo ? (
                <Image
                  width={72}
                  height={72}
                  unoptimized
                  src={p.photo}
                  alt="Tu foto de perfil"
                  className="profile-photo"
                />
              ) : (
                <div className="avatar">{p.name.slice(0, 1)}</div>
              )}
              <div>
                <label className="quiet-link" htmlFor="photo">
                  Cambiar foto
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => photo(e.target.files?.[0])}
                />
                <small>JPG, PNG o WebP. Máximo 5 MB.</small>
              </div>
            </div>
          </section>
          <section className="surface">
            <h2>Cambiar contraseña</h2>
            <form onSubmit={change} className="form-stack">
              {[
                ["current", "Contraseña actual"],
                ["new", "Nueva contraseña"],
                ["confirm", "Repite la nueva contraseña"],
              ].map(([name, label]) => (
                <div className="field" key={name}>
                  <label htmlFor={name}>{label}</label>
                  <input
                    id={name}
                    name={name}
                    type="password"
                    autoComplete={
                      name === "current" ? "current-password" : "new-password"
                    }
                    minLength={name === "current" ? undefined : 10}
                    maxLength={128}
                    required
                  />
                </div>
              ))}
              <Button disabled={busy} type="submit">
                Actualizar contraseña
              </Button>
              <p className="muted">
                La recuperación por correo estará disponible cuando se habilite
                el servicio de email.
              </p>
            </form>
          </section>
        </>
      )}
    </main>
  );
  return onboarding ? body : <AppShell>{body}</AppShell>;
}
