import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowLeft, Mail } from "lucide-react";
export default function Page() {
  return (
    <main id="main" className="center-page">
      <Brand />
      <section className="simple-panel">
        <Mail size={30} />
        <h1>Recuperar tu acceso</h1>
        <p>
          La recuperación por correo todavía no está habilitada. No podemos
          enviarte un enlace de restablecimiento por ahora.
        </p>
        <p>
          Si tienes una sesión abierta, puedes cambiar tu contraseña desde tu
          perfil usando tu contraseña actual.
        </p>
        <Link className="button-link" href="/login">
          <ArrowLeft size={17} />
          Volver a iniciar sesión
        </Link>
      </section>
    </main>
  );
}
