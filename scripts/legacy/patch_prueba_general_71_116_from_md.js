/* eslint-disable no-console */
"use strict";

/**
 * Parche para insertar/actualizar únicamente las preguntas 71 y 116
 * del examen "prueba_general", leyendo contenido desde Markdown.
 *
 * - Verifica el examen por slug = "prueba_general"
 * - Lee el archivo:
 *      (1) data/preguntas_patch_71_116.md  si existe
 *      (2) data/preguntas_61_120.md        en caso contrario
 * - Parsea los bloques "## Pregunta 71" y "## Pregunta 116"
 * - Upsert de Question y Option (idempotente)
 * - Limpia opciones obsoletas por pregunta (las que ya no estén en el MD)
 *
 * Requisitos:
 * - Variables de entorno de Prisma/DATABASE_URL configuradas
 * - Archivo(s) MD con formato consistente al ejemplo
 */

const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

// Configuración
const EXAM_SLUG = "prueba_general";
const PRIMARY_MD = path.join(process.cwd(), "data", "preguntas_61_120.md");
const PATCH_MD = path.join(process.cwd(), "data", "preguntas_patch_71_116.md");
const TARGET_INDEXES = new Set([71, 116]);

/* ------------------------------ Utilidades ------------------------------ */

function fileExists(p) {
  try {
    fssync.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeEOL(s) {
  return s.replace(/\r\n/g, "\n");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extrae el contenido entre un encabezado (regex) y el siguiente "fin" (regex lista) o el final.
 */
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

/** Lee "**Label:** valor" en la misma línea */
function extractInlineLabeledValue(src, label) {
  const rx = new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)`);
  const m = src.match(rx);
  return m ? m[1].trim() : null;
}

/** Parsea "Opciones de respuesta" -> [{label, text}] con soporte multilínea */
function parseOptionsBlock(block) {
  if (!block) return [];
  const lines = normalizeEOL(block).split("\n");

  const options = [];
  let currentLabel = null;
  let buf = [];

  // A. | A) | A- seguido de espacio
  const startRx = /^\s*([A-H])[.)-]\s*(.*)$/;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const m = line.match(startRx);
    if (m) {
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

/** Parsea bloque de ayudas "### Ayudas" -> { help1Md, help2Md } */
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

/** Divide el MD en bloques por pregunta y devuelve objetos con campos estructurados */
function parseMarkdownQuestions(md) {
  const src = normalizeEOL(md);
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
    const correctLabel = correctRaw
      ? correctRaw.trim().toUpperCase().replace(/[^A-H]/g, "")
      : null;

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
      code: null,
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
    throw new Error(
      `Pregunta inválida en índice ${q.orderIndex || "?"}: falta orderIndex o prompt.`
    );
  }

  const question = await tx.question.upsert({
    where: {
      examId_orderIndex: { examId, orderIndex: q.orderIndex },
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
    },
  });

  const labels = [];
  for (const opt of q.options) {
    if (!opt.label) continue;
    const label = opt.label.toUpperCase();
    labels.push(label);

    await tx.option.upsert({
      where: {
        questionId_label: { questionId: question.id, label },
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

  await tx.option.deleteMany({
    where: { questionId: question.id, NOT: { label: { in: labels } } },
  });

  return question;
}

/* ------------------------------- Ejecución ------------------------------- */

async function main() {
  console.log("=== Parche preguntas 71 y 116 (prueba_general) ===");

  const exam = await prisma.exam.findUnique({
    where: { slug: EXAM_SLUG },
    select: { id: true, slug: true, title: true },
  });
  if (!exam) {
    throw new Error(
      `No se encontró el examen con slug "${EXAM_SLUG}". Crea primero el examen.`
    );
  }

  // Auditar qué falta en BD
  const existing = await prisma.question.findMany({
    where: { examId: exam.id, orderIndex: { gte: 61, lte: 120 } },
    select: { orderIndex: true },
  });
  const existingSet = new Set(existing.map((q) => q.orderIndex));
  const missingWanted = [...TARGET_INDEXES].filter((i) => !existingSet.has(i));
  console.log(
    `BD: existen ${existingSet.size} preguntas en 61–120. Faltan (target): ${missingWanted.join(", ") || "ninguna"}`
  );

  // Resolver archivo MD a usar
  const mdPath = fileExists(PATCH_MD) ? PATCH_MD : PRIMARY_MD;
  console.log(`Leyendo markdown desde: ${mdPath}`);

  const md = await fs.readFile(mdPath, "utf8");
  const parsed = parseMarkdownQuestions(md);

  // Filtrar solo 71 y 116 que estén presentes en el MD
  const toApply = parsed.filter((q) => TARGET_INDEXES.has(q.orderIndex));
  if (toApply.length === 0) {
    throw new Error(
      "No se encontraron bloques '## Pregunta 71' o '## Pregunta 116' en el markdown proporcionado."
    );
  }

  // Validar que cada una tenga contenido mínimo
  for (const q of toApply) {
    if (!q.prompt || !q.options || q.options.length === 0) {
      throw new Error(
        `El bloque de la Pregunta ${q.orderIndex} carece de enunciado u opciones.`
      );
    }
  }

  // Upsert por pregunta (transacción por pregunta para aislar errores)
  let ok = 0;
  for (const q of toApply) {
    try {
      await prisma.$transaction(async (tx) => {
        await upsertQuestionWithOptions(tx, exam.id, q);
      });
      ok += 1;
      console.log(`✔ Parche aplicado: Pregunta ${q.orderIndex}`);
    } catch (err) {
      console.error(`✖ Error en Pregunta ${q.orderIndex}: ${err.message}`);
    }
  }

  console.log(`Finalizado. Preguntas parcheadas: ${ok}/${toApply.length}`);

  // Auditoría post-parche
  const after = await prisma.question.findMany({
    where: { examId: exam.id, orderIndex: { gte: 61, lte: 120 } },
    select: { orderIndex: true },
  });
  const afterSet = new Set(after.map((q) => q.orderIndex));
  const stillMissing = [...TARGET_INDEXES].filter((i) => !afterSet.has(i));
  if (stillMissing.length > 0) {
    console.warn(
      `Aún faltan en BD: ${stillMissing.join(", ")}. Verifica que estén en el MD y vuelve a ejecutar el script.`
    );
  } else {
    console.log("Parche verificado: 71 y 116 presentes en BD.");
  }
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
