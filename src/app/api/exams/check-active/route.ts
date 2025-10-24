import { NextRequest, NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { checkActiveExam } from "@/server/services/exam-service";

export async function POST(req: NextRequest) {
  const authToken = await readAuthToken();
  if (!authToken) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { examId } = body;

    if (!examId || typeof examId !== "string") {
      return NextResponse.json(
        { success: false, message: "examId es requerido" },
        { status: 400 }
      );
    }

    const activeAttempt = await checkActiveExam(authToken.sub!, examId);

    if (activeAttempt) {
      return NextResponse.json({
        success: true,
        hasActiveExam: true,
        activeExam: {
          attemptId: activeAttempt.id,
          examId: activeAttempt.exam.id,
          examSlug: activeAttempt.exam.slug,
          examTitle: activeAttempt.exam.title,
          durationMinutes: activeAttempt.exam.durationMinutes,
          startedAt: activeAttempt.startedAt.toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      hasActiveExam: false,
    });
  } catch (error) {
    console.error("Error al verificar examen activo:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
