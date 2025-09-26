import { AuthPage } from "../components/auth-page";
import { ResetForm } from "./reset-form";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function ResetPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const emailParam = searchParams.email;
  const email = typeof emailParam === "string" ? emailParam : Array.isArray(emailParam) ? emailParam[0] ?? "" : "";

  return (
    <AuthPage
      title="Ingresa con confianza"
      subtitle="Protegemos tu cuenta y tus datos para que solo te concentres en aprender."
    >
      <ResetForm initialEmail={email} />
    </AuthPage>
  );
}
