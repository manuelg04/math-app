import { NextResponse } from "next/server";
import { AttemptKind } from "@prisma/client";
import { startExamAttempt } from "@/server/services/exam-attempt-service";
import { checkActiveExam } from "@/server/services/exam-service";
import { readAuthToken } from "@/lib/auth";

function parseAttemptKind(value: unknown): AttemptKind | null {
  if (typeof value !== "string") return null;
  const maybeKind = value as AttemptKind;
  return Object.values(AttemptKind).includes(maybeKind) ? maybeKind : null;
}

function mapFailureStatus(code?: string) {
  switch (code) {
    case "ENTRY_ALREADY_COMPLETED":
    case "EXIT_ALREADY_COMPLETED":
      return 409;
    case "TRAINING_REQUIRES_PLACEMENT":
    case "EXIT_REQUIRES_PLACEMENT":
    case "EXIT_LOCKED":
    case "TRAINING_PLAN_INACTIVE":
      return 403;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  try {
    const authToken = await readAuthToken();
    if (!authToken) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const examId = String(body?.examId ?? "");
    const attemptKindInput = parseAttemptKind(body?.attemptKind) ?? AttemptKind.GENERIC;
    if (!examId) {
      return NextResponse.json({ success: false, message: "examId requerido" }, { status: 400 });
    }

    // Verificar si hay otro examen activo
    const activeAttempt = await checkActiveExam(authToken.sub, String(examId));
    if (activeAttempt) {
      return NextResponse.json(
        {
          success: false,
          message: "Ya tienes un examen en progreso",
          activeExam: {
            attemptId: activeAttempt.id,
            examId: activeAttempt.exam.id,
            examSlug: activeAttempt.exam.slug,
            examTitle: activeAttempt.exam.title,
            durationMinutes: activeAttempt.exam.durationMinutes,
            startedAt: activeAttempt.startedAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    const result = await startExamAttempt(authToken.sub, examId, attemptKindInput);
    if (!result.success) {
      return NextResponse.json(result, { status: mapFailureStatus(result.code) });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error al iniciar intento:", err);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
