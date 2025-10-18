import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { ToastProvider } from "@/hooks/use-toast";
import "./globals.css";
import "katex/dist/katex.min.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "Math App | Autenticación",
  description: "Portal de aprendizaje con autenticación segura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${workSans.variable} bg-background font-sans text-foreground antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
