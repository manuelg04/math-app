import { NextRequest, NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authToken = await readAuthToken();
  if (!authToken) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  try {
    const { id: attemptId } = await params;
    const body = await req.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "examId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el attempt existe, pertenece al usuario y está activo
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        userId: authToken.sub,
        examId: examId,
        status: "IN_PROGRESS",
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Intento no válido" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al validar intento:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
