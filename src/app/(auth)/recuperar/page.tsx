import { AuthPage } from "../components/auth-page";
import { RecoverForm } from "./recover-form";

export default function RecoverPage() {
  return (
    <AuthPage
      title="¿Tienes problemas para ingresar?"
      subtitle="Recupera tu contraseña y sigue reforzando tus conocimientos sin perder tu progreso."
    >
      <RecoverForm />
    </AuthPage>
  );
}
