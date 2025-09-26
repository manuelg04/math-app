import { AuthPage } from "../components/auth-page";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthPage
      title="Aprende a tu propio ritmo"
      subtitle="Regístrate para acceder a recursos interactivos, evaluaciones guiadas y progreso en tiempo real."
    >
      <RegisterForm />
    </AuthPage>
  );
}
