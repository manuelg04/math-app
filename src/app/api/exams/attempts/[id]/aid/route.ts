import { NextResponse } from "next/server";
import { logAidUsage } from "@/server/services/exam-attempt-service";
import { readAuthToken } from "@/lib/auth";
import { AidKey } from "@prisma/client";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: attemptId } = await context.params;
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const questionId = String(body?.questionId ?? "");
    const aidKey = String(body?.aidKey ?? ""); // "AID1" | "AID2" | "AI_ASSIST"

    if (!questionId || !aidKey || !["AID1", "AID2", "AI_ASSIST"].includes(aidKey)) {
      return NextResponse.json(
        { success: false, message: "questionId y aidKey requeridos/válidos" },
        { status: 400 }
      );
    }

    const result = await logAidUsage(attemptId, questionId, aidKey as AidKey, authToken.sub);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error al registrar ayuda:", err);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
