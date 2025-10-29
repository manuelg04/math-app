import { Suspense } from "react";
import { AuthPage } from "../components/auth-page";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthPage
      title="Refuerza tus habilidades de razonamiento cuantitativo"
      subtitle="Entrenamiento personalizado para enfrentar con éxito las pruebas del ICFES."
      description="Desarrolla las habilidades matemáticas esenciales que todo ciudadano necesita para resolver problemas cotidianos. Práctica con preguntas tipo ICFES y mejora en interpretación, formulación y argumentación con información cuantitativa."
    >
      <Suspense fallback={<div className="flex justify-center p-4">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
