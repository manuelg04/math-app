import { NextResponse } from "next/server";
import { submitExamAttempt } from "@/server/services/exam-attempt-service";
import { readAuthToken } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      console.error("[Submit] No autenticado");
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const { id: attemptId } = await params;
    const body = await request.json();
    const timeSpent = Number(body?.timeSpent ?? 0);

    console.log("[Submit] attemptId:", attemptId, "userId:", authToken.sub, "timeSpent:", timeSpent);

    if (timeSpent < 0) {
      console.error("[Submit] timeSpent inválido:", timeSpent);
      return NextResponse.json({ success: false, message: "timeSpent inválido" }, { status: 400 });
    }

    const result = await submitExamAttempt(attemptId, authToken.sub, timeSpent);

    if (!result.success) {
      console.error("[Submit] Error del servicio:", result.error);
    } else {
      console.log("[Submit] Éxito:", result.attempt);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Submit] Error crítico:", err);
    return NextResponse.json({
      success: false,
      message: "Error interno",
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
