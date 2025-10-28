/* eslint-disable no-console */
"use strict";
const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

const EXAM_SLUG = "prueba_general";
const MD_FILE = path.join(process.cwd(), "data", "preguntas_61_120.md");

/* ------------------------------ Utilidades ------------------------------ */

function normalizeEOL(s) {
  return s.replace(/\r\n/g, "\n");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function extractBetween(src, startRegex, endRegexes) {
  const startMatch = src.match(startRegex);
  if (!startMatch) return null;

  const startIndex = startMatch.index + startMatch[0].length;
  let endIndex = src.length;

  for (const endRx of endRegexes) {
    const m = src.slice(startIndex).match(endRx);
    if (m) {
      const idx = startIndex + m.index;
      if (idx < endIndex) endIndex = idx;
    }
  }
  return src.slice(startIndex, endIndex).trim();
}


function extractInlineLabeledValue(src, label) {
  const rx = new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)`);
  const m = src.match(rx);
  return m ? m[1].trim() : null;
}

function parseOptionsBlock(block) {
  if (!block) return [];
  const lines = normalizeEOL(block).split("\n");

  const options = [];
  let currentLabel = null;
  let buf = [];

  const startRx = /^\s*([A-H])[.)-]\s*(.*)$/; // A. | A) | A-
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, ""); // limpiar espacios a la derecha
    const m = line.match(startRx);
    if (m) {
      // guardar opción previa
      if (currentLabel) {
        options.push({ label: currentLabel, text: buf.join("\n").trim() });
      }
      currentLabel = m[1].toUpperCase();
      const firstText = m[2] || "";
      buf = [firstText];
    } else if (currentLabel) {
      buf.push(line);
    }
  }
  if (currentLabel) {
    options.push({ label: currentLabel, text: buf.join("\n").trim() });
  }

  return options;
}

/**
 * Parsea el bloque "Ayudas" devolviendo { help1Md, help2Md }
 */
function parseAyudasBlock(block) {
  if (!block) return { help1Md: null, help2Md: null };

  const help1 = extractBetween(
    block,
    /^####\s*Ayuda\s*1\s*$/m,
    [/^####\s*Ayuda\s*2\s*$/m, /^##\s*Pregunta\s+\d+\s*$/m]
  );

  const help2 = extractBetween(
    block,
    /^####\s*Ayuda\s*2\s*$/m,
    [/^####\s*Ayuda\s*\d+\s*$/m, /^##\s*Pregunta\s+\d+\s*$/m]
  );

  return {
    help1Md: help1 || null,
    help2Md: help2 || null,
  };
}


function parseMarkdownQuestions(md) {
  const src = normalizeEOL(md);

  // Encontrar todos los encabezados "## Pregunta N"
  const headerRx = /^##\s*Pregunta\s+(\d+)\s*$/gm;

  const matches = [...src.matchAll(headerRx)];
  const blocks = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const numero = parseInt(m[1], 10);
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : src.length;
    const body = src.slice(start, end).trim();
    blocks.push({ numero, body });
  }

  const questions = [];

  for (const { numero, body } of blocks) {
    const competency = extractInlineLabeledValue(body, "Competencia");
    const evidence = extractInlineLabeledValue(body, "Evidencia");
    const contentArea = extractInlineLabeledValue(body, "Contenido");
    const context = extractInlineLabeledValue(body, "Contexto");

    const correctRaw = extractInlineLabeledValue(body, "Respuesta correcta");
    const correctLabel = correctRaw ? correctRaw.trim().toUpperCase().replace(/[^A-H]/g, "") : null;

    const enunciado = extractBetween(
      body,
      /^###\s*Enunciado\s*$/m,
      [/^###\s*Opciones\s*de\s*respuesta\s*$/m, /^###\s*Ayudas\s*$/m, /^##\s*Pregunta\s+\d+\s*$/m]
    );

    const opcionesBlock = extractBetween(
      body,
      /^###\s*Opciones\s*de\s*respuesta\s*$/m,
      [/^###\s*Ayudas\s*$/m, /^##\s*Pregunta\s+\d+\s*$/m]
    );
    const options = parseOptionsBlock(opcionesBlock);

    const ayudasBlock = extractBetween(
      body,
      /^###\s*Ayudas\s*$/m,
      [/^##\s*Pregunta\s+\d+\s*$/m]
    );
    const { help1Md, help2Md } = parseAyudasBlock(ayudasBlock || "");

    questions.push({
      orderIndex: numero,
      code: null, // no hay código en el MD de ejemplo
      prompt: (enunciado || "").trim(),
      competency: competency || null,
      evidence: evidence || null,
      contentArea: contentArea || null,
      context: context || null,
      help1Md,
      help2Md,
      correctLabel: correctLabel || null,
      options,
    });
  }

  return questions;
}

/* ------------------------------ Persistencia ------------------------------ */

async function upsertQuestionWithOptions(tx, examId, q) {
  if (!q.orderIndex || !q.prompt) {
    throw new Error(`Pregunta inválida en índice ${q.orderIndex}: falta orderIndex o prompt.`);
  }

  // Upsert de la pregunta
  const question = await tx.question.upsert({
    where: {
      examId_orderIndex: {
        examId,
        orderIndex: q.orderIndex,
      },
    },
    create: {
      examId,
      orderIndex: q.orderIndex,
      code: q.code,
      prompt: q.prompt,
      competency: q.competency,
      evidence: q.evidence,
      contentArea: q.contentArea,
      context: q.context,
      help1Md: q.help1Md,
      help2Md: q.help2Md,
    },
    update: {
      code: q.code,
      prompt: q.prompt,
      competency: q.competency,
      evidence: q.evidence,
      contentArea: q.contentArea,
      context: q.context,
      help1Md: q.help1Md,
      help2Md: q.help2Md,
      // updatedAt se actualiza solo por @updatedAt
    },
  });

  // Upsert de opciones por label + limpieza de obsoletas
  const labels = [];
  for (const opt of q.options) {
    if (!opt.label) continue;
    const label = opt.label.toUpperCase();
    labels.push(label);

    await tx.option.upsert({
      where: {
        questionId_label: {
          questionId: question.id,
          label,
        },
      },
      create: {
        questionId: question.id,
        label,
        text: opt.text || null,
        imageUrl: null,
        isCorrect: q.correctLabel ? label === q.correctLabel : false,
      },
      update: {
        text: opt.text || null,
        imageUrl: null,
        isCorrect: q.correctLabel ? label === q.correctLabel : false,
      },
    });
  }

  // Eliminar opciones que ya no existan en el MD
  await tx.option.deleteMany({
    where: {
      questionId: question.id,
      NOT: { label: { in: labels } },
    },
  });

  return question;
}

async function main() {
  console.log("Iniciando ingesta de preguntas 61–120 para el examen:", EXAM_SLUG);

  const exam = await prisma.exam.findUnique({
    where: { slug: EXAM_SLUG },
    select: { id: true, slug: true, title: true },
  });

  if (!exam) {
    throw new Error(
      `No se encontró el examen con slug "${EXAM_SLUG}". ` +
        `Cree primero el examen 'prueba_general' o ajuste EXAM_SLUG en este script.`
    );
  }

  const md = await fs.readFile(MD_FILE, "utf8");
  const parsed = parseMarkdownQuestions(md);

  // Filtrar explícitamente por el rango 61–120 por seguridad
  const ranged = parsed.filter((q) => q.orderIndex >= 61 && q.orderIndex <= 120);

  if (ranged.length === 0) {
    throw new Error("No se detectaron preguntas en el rango 61–120 en el archivo markdown.");
  }

  console.log(`Preguntas detectadas en el rango 61–120: ${ranged.length}`);

  // Transacción por pregunta para aislar errores y dar trazabilidad
  let ok = 0;
  for (const q of ranged) {
    try {
      await prisma.$transaction(async (tx) => {
        await upsertQuestionWithOptions(tx, exam.id, q);
      });
      ok += 1;
      console.log(`✔ Ingestada Pregunta ${q.orderIndex}`);
    } catch (err) {
      console.error(`✖ Error en Pregunta ${q.orderIndex}:`, err.message);
    }
  }

  console.log(`Finalizado. Preguntas insertadas/actualizadas: ${ok}/${ranged.length}`);
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
