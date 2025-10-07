import { NextResponse } from "next/server";
import { getExamBySlug, getUserExamAttempts } from "@/server/services/exam-service";
import { readAuthToken } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const { slug } = await params;
    const result = await getExamBySlug(slug);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 404 });
    }

    // Obtener intentos previos del usuario
    const attempts = await getUserExamAttempts(authToken.sub, result.exam.id);

    return NextResponse.json({
      success: true,
      exam: result.exam,
      attempts,
    });
  } catch (error) {
    console.error("Error al obtener examen:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
