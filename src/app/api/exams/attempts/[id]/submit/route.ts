import { NextResponse } from "next/server";
import { submitExamAttempt } from "@/server/services/exam-attempt-service";
import { readAuthToken } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const { id: attemptId } = await params;
    const body = await request.json();
    const timeSpent = Number(body?.timeSpent ?? 0);
    if (timeSpent < 0) {
      return NextResponse.json({ success: false, message: "timeSpent inválido" }, { status: 400 });
    }

    const result = await submitExamAttempt(attemptId, authToken.sub, timeSpent);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error al enviar intento:", err);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
