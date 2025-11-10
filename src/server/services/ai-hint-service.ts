import { AidKey, AttemptKind, AttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OPENAI_MODEL = "gpt-5-mini-2025-08-07";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>/i;

function hasImages(prompt: string, choiceImageUrls: Array<string | null | undefined>) {
  if (IMAGE_PATTERN.test(prompt)) {
    return true;
  }
  return choiceImageUrls.some(Boolean);
}

function buildPrompt(params: {
  promptMarkdown: string;
  choices: Array<{ label: string; text: string | null }>;
  academicProgram: string | null;
}) {
  const { promptMarkdown, choices, academicProgram } = params;
  const lines = [
    "Eres un tutor de matemáticas universitarias. Responde en español con un máximo de 800 caracteres,",
    "sin imágenes. Usa notación matemática clara (puedes emplear LaTeX inline). Ofrece solo una pista breve.",
    "",
    `Programa académico: ${academicProgram || "No especificado"}`,
    "",
    "Pregunta:",
    promptMarkdown,
    "",
    "Opciones:",
  ];
  for (const choice of choices) {
    lines.push(`${choice.label}) ${choice.text ?? ""}`.trim());
  }
  lines.push("", "Instrucciones: Orienta al estudiante sin resolver completamente el ejercicio.");
  return lines.join("\n");
}

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<
      | { type: "output_text"; text?: string }
      | { type: "input_text"; text?: string }
      | { type: string; text?: string }
    >;
  }>;
};

function extractOutputText(payload: OpenAiResponse): string | null {
  if (payload.output_text && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }
  const fromContent = payload.output?.find((item) =>
    item.content?.some((block) => block.type === "output_text" && typeof block.text === "string")
  );
  if (fromContent) {
    const block = fromContent.content!.find(
      (entry) => entry.type === "output_text" && typeof entry.text === "string"
    );
    if (block?.text && block.text.trim().length > 0) {
      return block.text.trim();
    }
  }
  return null;
}

async function requestOpenAiHint(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada");
  }

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as OpenAiResponse;

  const output = extractOutputText(data);
  if (!output) {
    throw new Error("OpenAI no entregó contenido");
  }
  return output.length > 800 ? `${output.slice(0, 800).trim()}…` : output;
}

export async function getOrCreateAiHint(params: {
  attemptId: string;
  questionId: string;
  userId: string;
  fallbackAcademicProgram?: string | null;
}) {
  const { attemptId, questionId, userId, fallbackAcademicProgram } = params;

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      examId: true,
      kind: true,
      status: true,
      user: { select: { academicProgram: true } },
    },
  });

  if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
    return { success: false, message: "Intento no válido", status: 400 };
  }
  if (attempt.kind !== AttemptKind.TRAINING) {
    return { success: false, message: "La ayuda IA solo está disponible en entrenamientos", status: 403 };
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, examId: attempt.examId },
    select: {
      id: true,
      prompt: true,
      choices: {
        select: {
          label: true,
          text: true,
          imageUrl: true,
        },
        orderBy: { label: "asc" },
      },
    },
  });

  if (!question) {
    return { success: false, message: "Pregunta no encontrada", status: 404 };
  }

  if (hasImages(question.prompt, question.choices.map((c) => c.imageUrl))) {
    return { success: false, message: "La ayuda IA no está disponible para preguntas con imágenes", status: 409 };
  }

  const existingUsage = await prisma.examAidUsage.findUnique({
    where: {
      attemptId_questionId_aidKey: {
        attemptId,
        questionId,
        aidKey: AidKey.AI_ASSIST,
      },
    },
    select: {
      aiHint: true,
    },
  });

  if (existingUsage?.aiHint) {
    return { success: true, hint: existingUsage.aiHint };
  }

  const prompt = buildPrompt({
    promptMarkdown: question.prompt,
    choices: question.choices.map((choice) => ({ label: choice.label, text: choice.text })),
    academicProgram: attempt.user.academicProgram ?? fallbackAcademicProgram ?? null,
  });

  try {
    const hint = await requestOpenAiHint(prompt);

    await prisma.examAidUsage.upsert({
      where: {
        attemptId_questionId_aidKey: {
          attemptId,
          questionId,
          aidKey: AidKey.AI_ASSIST,
        },
      },
      create: {
        attemptId,
        questionId,
        aidKey: AidKey.AI_ASSIST,
        aiHint: hint,
      },
      update: {
        aiHint: hint,
      },
    });

    return { success: true, hint };
  } catch (error) {
    console.error("Error solicitando ayuda IA:", error);
    return { success: false, message: "No se pudo generar la ayuda IA", status: 502 };
  }
}
