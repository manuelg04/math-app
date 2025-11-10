import { NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { getOrCreateAiHint } from "@/server/services/ai-hint-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: attemptId } = await context.params;
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const questionId = typeof body?.questionId === "string" ? body.questionId : "";
    const academicProgram =
      typeof body?.academicProgram === "string" && body.academicProgram.trim().length > 0
        ? body.academicProgram.trim()
        : null;
    if (!questionId) {
      return NextResponse.json({ success: false, message: "questionId requerido" }, { status: 400 });
    }

    const result = await getOrCreateAiHint({
      attemptId,
      questionId,
      userId: token.sub,
      fallbackAcademicProgram: academicProgram,
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status ?? 400 }
      );
    }

    return NextResponse.json({ success: true, hint: result.hint });
  } catch (error) {
    console.error("Error generando ayuda IA:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
