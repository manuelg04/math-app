/* eslint-disable no-console */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Configuración
 */
const EXAM_SLUG = "saberpro_exam";
const EXAM_TITLE = "Prueba de Entrada – Salida";
const EXAM_DESCRIPTION = "Prueba de entrada de 35 preguntas.";

// Ruta del Markdown fuente
const MD_PATH =
  process.env.MD_PATH ||
  path.join(__dirname, "../data/prueba_entrada_salida.md");

// Debug opcional (escribe un JSON con lo parseado)
const SEED_DEBUG = (process.env.SEED_DEBUG || "1") === "1";
const DEBUG_JSON_PATH = path.join(__dirname, "../data/debug_parsed_from_md.json");

/**
 * Utilidades
 */
function normEOL(s) {
  return (s || "").replace(/\r\n/g, "\n");
}
function cleanText(s) {
  return (s || "").replace(/\u00A0/g, " ").trim();
}
function matchOne(re, text) {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Extrae bloques "## Pregunta N" → cuerpo
 */
function splitQuestions(md) {
  const blocks = [];
  const re = /^##\s*Pregunta\s+(\d+)\s*[\n]+([\s\S]*?)(?=^##\s*Pregunta\s+\d+|(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    const number = parseInt(m[1], 10);
    const body = m[2] || "";
    blocks.push({ number, body });
  }
  return blocks;
}

/**
 * Extrae metadatos en una línea: **Etiqueta:** valor
 */
function extractInlineMeta(body, label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
  return matchOne(re, body);
}

/**
 * Extrae un bloque delimitado por etiquetas negrita
 * **Start:** ... **End:**
 */
function extractBlock(body, startLabel, endLabel) {
  const startRe = new RegExp(`\\*\\*${startLabel}:\\*\\*\\s*`);
  const endRe = endLabel ? new RegExp(`\\*\\*${endLabel}:\\*\\*`) : null;

  const startMatch = body.match(startRe);
  if (!startMatch) return "";
  const startIndex = startMatch.index + startMatch[0].length;
  const tail = body.slice(startIndex);

  if (endRe) {
    const endMatch = tail.match(endRe);
    if (endMatch) {
      return tail.slice(0, endMatch.index).trim();
    }
  }
  return tail.trim();
}

/**
 * Parsea opciones desde un bloque con líneas que empiezan con A./A) ... D./D)
 * Soporta contenido multilínea (tablas, imágenes, etc.) entre marcadores.
 * Además detecta si la opción es una imagen con patrón ![alt](url)
 */
function parseOptions(optionsBlock) {
  const text = normEOL(optionsBlock);
  const markerRe = /^([A-D])[.)]\s*/gm;

  const markers = [];
  let m;
  while ((m = markerRe.exec(text)) !== null) {
    markers.push({ letter: m[1], index: m.index, len: m[0].length });
  }

  const results = [];

  if (markers.length >= 2) {
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index + markers[i].len;
      const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const raw = text.slice(start, end).trim();
      results.push({ letter: markers[i].letter, raw });
    }
  } else {
    // Fallback simple: A) xxx en una línea
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const lm = l.match(/^([A-D])[.)]\s+(.+)$/);
      if (lm) results.push({ letter: lm[1], raw: lm[2] });
    }
  }

  // Normalizar a 4
  const letters = ["A", "B", "C", "D"];
  const byLetter = new Map(results.map((r) => [r.letter, r.raw]));
  const out = [];
  for (const L of letters) {
    const raw = byLetter.has(L) ? byLetter.get(L).trim() : "";
    // Detectar imagen ![...](url)
    const imgMatch = raw.match(/!\[[^\]]*?\]\(([^)]+)\)/);
    const imageUrl = imgMatch ? imgMatch[1].trim() : null;
    // Texto plano (sin el tag de imagen)
    const textOnly = imageUrl ? raw.replace(/!\[[^\]]*?\]\([^)]+?\)/, "").trim() : raw;
    out.push({ label: L, text: textOnly || null, imageUrl });
  }

  return out;
}

/**
 * Parser principal del Markdown
 */
function parseMarkdown(md) {
  const questions = [];
  const blocks = splitQuestions(md);

  for (const b of blocks) {
    const number = b.number;

    const competency = extractInlineMeta(b.body, "Competencia");
    const evidence = extractInlineMeta(b.body, "Evidencia");
    const contentArea = extractInlineMeta(b.body, "Contenido");
    const context = extractInlineMeta(b.body, "Contexto");
    const correct = extractInlineMeta(b.body, "Respuesta correcta");
    const correctLetter = correct ? cleanText(correct).toUpperCase().replace(/[^A-D]/g, "") : null;

    const promptMd = extractBlock(b.body, "Enunciado", "Opciones de respuesta");
    const optionsBlock = extractBlock(b.body, "Opciones de respuesta", null);
    const options = parseOptions(optionsBlock);

    // NUEVO: Ayudas
    const help1 = extractBlock(b.body, "Ayuda 1", "Ayuda 2");
    const help2 = extractBlock(b.body, "Ayuda 2", null);

    // Validaciones mínimas
    if (!Number.isInteger(number)) {
      throw new Error(`Pregunta con número inválido: "${number}"`);
    }
    if (!promptMd) {
      throw new Error(`Pregunta ${number} sin enunciado.`);
    }
    if (!options || options.length !== 4) {
      throw new Error(`Pregunta ${number} no tiene 4 opciones detectadas.`);
    }
    if (!correctLetter || !/^[ABCD]$/.test(correctLetter)) {
      throw new Error(`Pregunta ${number} con "Respuesta correcta" inválida: "${correct}"`);
    }

    questions.push({
      number,
      promptMd: cleanText(promptMd),
      options,
      correctLetter,
      competency: competency || null,
      evidence: evidence || null,
      contentArea: contentArea || null,
      context: context || null,
      help1Md: help1 || null,
      help2Md: help2 || null,
    });
  }

  // Orden y duplicados
  const byNum = new Map();
  for (const q of questions) {
    if (!byNum.has(q.number)) byNum.set(q.number, q);
  }
  return Array.from(byNum.values()).sort((a, b) => a.number - b.number);
}

/**
 * Persistencia
 */
async function upsertExam() {
  return prisma.exam.upsert({
    where: { slug: EXAM_SLUG },
    update: { title: EXAM_TITLE, description: EXAM_DESCRIPTION, isActive: true },
    create: { slug: EXAM_SLUG, title: EXAM_TITLE, description: EXAM_DESCRIPTION, version: 1, isActive: true },
  });
}

async function upsertQuestionWithOptions(examId, q) {
  const existing = await prisma.question.findFirst({
    where: { examId, orderIndex: q.number },
    select: { id: true },
  });

  let questionId;
  if (existing) {
    const updated = await prisma.question.update({
      where: { id: existing.id },
      data: {
        code: `Pregunta ${q.number}`,
        prompt: q.promptMd,
        competency: q.competency,
        evidence: q.evidence,
        contentArea: q.contentArea,
        context: q.context,
        help1Md: q.help1Md,
        help2Md: q.help2Md,
      },
      select: { id: true },
    });
    questionId = updated.id;
    await prisma.option.deleteMany({ where: { questionId } });
  } else {
    const created = await prisma.question.create({
      data: {
        examId,
        orderIndex: q.number,
        code: `Pregunta ${q.number}`,
        prompt: q.promptMd,
        competency: q.competency,
        evidence: q.evidence,
        contentArea: q.contentArea,
        context: q.context,
        help1Md: q.help1Md,
        help2Md: q.help2Md,
      },
      select: { id: true },
    });
    questionId = created.id;
  }

  const correctIdx = q.correctLetter.charCodeAt(0) - "A".charCodeAt(0);
  const labels = ["A", "B", "C", "D"];

  for (let i = 0; i < labels.length; i++) {
    const opt = q.options[i];
    await prisma.option.create({
      data: {
        questionId,
        label: labels[i],
        text: opt.text,            // puede ser null
        imageUrl: opt.imageUrl,    // puede ser null
        isCorrect: i === correctIdx,
      },
    });
  }

  return questionId;
}

/**
 * Main
 */
async function main() {
  if (!fs.existsSync(MD_PATH)) {
    console.error(`No se encontró el Markdown en: ${MD_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(MD_PATH, "utf8");
  const md = normEOL(raw);

  const questions = parseMarkdown(md);

  if (SEED_DEBUG) {
    fs.writeFileSync(
      DEBUG_JSON_PATH,
      JSON.stringify({ count: questions.length, numbers: questions.map(q => q.number), sample: questions[0] }, null, 2),
      "utf8"
    );
    console.log(`JSON de debug guardado en: ${DEBUG_JSON_PATH}`);
  }

  if (questions.length === 0) {
    console.error("No se detectaron preguntas. Revisa el formato del Markdown.");
    process.exit(1);
  }

  console.log(`Se detectaron ${questions.length} preguntas. Insertando en DB...`);
  const exam = await upsertExam();
  for (const q of questions) {
    await upsertQuestionWithOptions(exam.id, q);
  }
  console.log(`Listo. Examen "${EXAM_TITLE}" (${EXAM_SLUG}) con ${questions.length} preguntas importadas/actualizadas.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
