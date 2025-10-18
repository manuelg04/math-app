import { NextResponse } from "next/server";
import { saveAnswer } from "@/server/services/exam-attempt-service";
import { readAuthToken } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }
    const attemptId = params.id;
    const body = await request.json();
    const questionId = String(body?.questionId ?? "");
    const selectedOptionId = String(body?.selectedOptionId ?? "");

    if (!questionId || !selectedOptionId) {
      return NextResponse.json(
        { success: false, message: "questionId y selectedOptionId requeridos" },
        { status: 400 }
      );
    }

    const result = await saveAnswer(attemptId, questionId, selectedOptionId, authToken.sub);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error al guardar respuesta:", err);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
