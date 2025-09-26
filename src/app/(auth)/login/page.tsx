import { Suspense } from "react";
import { AuthPage } from "../components/auth-page";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthPage
      title="Potencia tus habilidades matemáticas"
      subtitle="Accede a paneles personalizados, retos diarios y clases en vivo diseñadas para tu nivel."
    >
      <Suspense fallback={<div className="flex justify-center p-4">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </AuthPage>
  );
}
