import { redirect } from "next/navigation";
import { readAuthToken } from "@/lib/auth";
import { getExamBySlug } from "@/server/services/exam-service";
import { ExamClient } from "./exam-client";

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const authToken = await readAuthToken();
  if (!authToken) {
    redirect("/login");
  }

  const { slug } = await params;
  const result = await getExamBySlug(slug);

  if (!result.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-destructive">Examen no encontrado</h1>
          <p className="mt-2 text-muted-foreground">
            El examen que buscas no existe o no está disponible.
          </p>
        </div>
      </main>
    );
  }

  return <ExamClient examData={result.exam} />;
}
