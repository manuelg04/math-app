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
  competency?: string | null;
  contentArea?: string | null;
  contextNote?: string | null;
}) {
  const { promptMarkdown, choices, academicProgram, competency, contentArea, contextNote } = params;

  const summaryLines = [
    `Programa académico del estudiante: ${academicProgram || "No especificado"}`,
    competency ? `Competencia / tema: ${competency}` : null,
    contentArea ? `Área de contenido: ${contentArea}` : null,
    contextNote ? `Contexto reportado en el ejercicio: ${contextNote}` : null,
  ].filter(Boolean) as string[];

  const originalOptions = choices
    .map((choice) => `${choice.label}) ${choice.text ?? ""}`.trim())
    .join("\n");

  return [
    "Actúa como tutor experto en razonamiento cuantitativo para educación superior.",
    "Debes generar un NUEVO problema contextualizado al ejercicio del estudiante y a su programa académico.",
    "",
    "Formato obligatorio en Markdown:",
    "### Contexto",
    "Describe el escenario laboral o profesional pertinente.",
    "### Problema",
    "Plantea el enunciado completo del nuevo ejercicio.",
    "### Opciones",
    "- A) ...",
    "- B) ...",
    "- C) ...",
    "- D) ...",
    "### Resolución paso a paso",
    "Explica la solución en máximo 5-6 pasos numerados e identifica cuál opción es correcta.",
    "",
    "Requisitos estrictos:",
    "- Incluye exactamente cuatro opciones (A-D) con UNA sola respuesta correcta.",
    "- Usa valores numéricos realistas (enteros o decimales con una sola cifra decimal).",
    "- El contexto debe ser verosímil para el programa académico indicado.",
    "- Relaciona el nuevo problema con la misma competencia o tema del ejercicio original.",
    "- La resolución debe ser clara, sin rodeos y sin exceder los 6 pasos.",
    "- No reveles la opción correcta fuera de la sección de resolución.",
    "",
    "Datos del ejercicio original para inspirarte:",
    ...summaryLines,
    "",
    "Enunciado original:",
    promptMarkdown,
    "",
    "Opciones originales:",
    originalOptions,
    "",
    "Recuerda: genera un problema NUEVO (no copies el original) y mantén la respuesta correcta coherente con la solución descrita.",
  ].join("\n");
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
  return output.trim();
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
      competency: true,
      contentArea: true,
      context: true,
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
    competency: question.competency,
    contentArea: question.contentArea,
    contextNote: question.context,
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
