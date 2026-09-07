import type { Metadata } from "next";
import { Work_Sans, Fraunces } from "next/font/google";
import { Providers } from "./providers";
import { getToken } from "@/lib/auth-server";
import "./globals.css";
const sans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
export const metadata: Metadata = {
  title: { default: "RQ+ · Aprende a razonar", template: "%s · RQ+" },
  description:
    "Tu espacio de razonamiento cuantitativo. Evalúa tus habilidades, practica a tu ritmo y descubre tu progreso.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  return (
    <html lang="es">
      <body className={`${sans.variable} ${serif.variable}`}>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <Providers initialToken={token}>{children}</Providers>
      </body>
    </html>
  );
}
