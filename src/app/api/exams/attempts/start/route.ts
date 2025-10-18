import { NextResponse } from "next/server";
import { startExamAttempt } from "@/server/services/exam-attempt-service";
import { readAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }
    const { examId } = await request.json();
    if (!examId) {
      return NextResponse.json({ success: false, message: "examId requerido" }, { status: 400 });
    }
    const result = await startExamAttempt(authToken.sub, String(examId));
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error al iniciar intento:", err);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
