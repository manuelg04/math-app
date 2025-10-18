/* eslint-disable no-console */
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Config
 * Ajusta SLUG/TITLE/DESCRIPTION para la "prueba general"
 */
const EXAM_SLUG = process.env.EXAM_SLUG || "prueba_general";
const EXAM_TITLE = process.env.EXAM_TITLE || "Prueba General";
const EXAM_DESCRIPTION = process.env.EXAM_DESCRIPTION || "Prueba general (con ayudas).";

// Directorio donde están los q###.md (por ejemplo, "out/questions" del conversor)
const QUESTIONS_DIR = process.env.QUESTIONS_DIR || path.join(__dirname, "../out/questions");

// Prefijo público para imágenes si quieres servirlas desde /public
// Si copias out/images → public/exams/prueba_general/images, el prefijo sería:
const PUBLIC_IMAGE_PREFIX = process.env.PUBLIC_IMAGE_PREFIX || "/exams/prueba_general/images";

/**
 * Helpers
 */
function readAllQuestionFiles(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(".md"))
    .map(f => path.join(dir, f))
    .sort();
  return files;
}

function parseFrontMatter(mdText) {
  const txt = mdText || "";
  if (!txt.startsWith("---")) return { fm: {}, body: txt };
  const end = txt.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: txt };
  const yamlRaw = txt.slice(3, end).trim();
  const body = txt.slice(end + 4).trim();
  const fm = YAML.parse(yamlRaw) || {};
  return { fm, body };
}

function normalizeImagePath(p) {
  if (!p) return null;
  // si ya es absoluta (http/https o /...), la dejamos
  if (/^https?:\/\//i.test(p) || p.startsWith("/")) return p;
  // si es relativa (out/images/q001-...), la reescribimos con el prefijo público
  const filename = p.split("/").pop();
  return `${PUBLIC_IMAGE_PREFIX}/${filename}`;
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

async function upsertQuestionWithOptions(examId, fm) {
  // Campos esperados en YAML:
  // id, competencia, evidencia, contenido, contexto, respuesta_correcta,
  // enunciado_md, imagenes_enunciado[], opciones[], ayuda_1_md, ayuda_2_md
  const number = parseInt(String(fm.id), 10);
  if (!Number.isFinite(number)) throw new Error(`YAML sin id válido: ${fm.id}`);
  const correctLetter = (fm.respuesta_correcta || "").toString().trim().toUpperCase();
  if (!/^[A-F]$/.test(correctLetter)) throw new Error(`Pregunta ${number}: respuesta_correcta inválida: "${correctLetter}"`);

  // Construir prompt final: enunciado_md + imágenes (si quieres mostrarlas también en el prompt)
  let promptMd = (fm.enunciado_md || "").toString();
  if (Array.isArray(fm.imagenes_enunciado) && fm.imagenes_enunciado.length > 0) {
    for (const p of fm.imagenes_enunciado) {
      const url = normalizeImagePath(String(p));
      promptMd += `\n\n![Enunciado](${url})`;
    }
  }

  // Upsert question
  const existing = await prisma.question.findFirst({
    where: { examId, orderIndex: number },
    select: { id: true },
  });

  let questionId;
  if (existing) {
    const updated = await prisma.question.update({
      where: { id: existing.id },
      data: {
        code: `Pregunta ${number}`,
        prompt: promptMd,
        competency: fm.competencia || null,
        evidence: fm.evidencia || null,
        contentArea: fm.contenido || null,
        context: fm.contexto || null,
        help1Md: fm.ayuda_1_md || null,
        help2Md: fm.ayuda_2_md || null,
      },
      select: { id: true },
    });
    questionId = updated.id;
    await prisma.option.deleteMany({ where: { questionId } });
  } else {
    const created = await prisma.question.create({
      data: {
        examId,
        orderIndex: number,
        code: `Pregunta ${number}`,
        prompt: promptMd,
        competency: fm.competencia || null,
        evidence: fm.evidencia || null,
        contentArea: fm.contenido || null,
        context: fm.contexto || null,
        help1Md: fm.ayuda_1_md || null,
        help2Md: fm.ayuda_2_md || null,
      },
      select: { id: true },
    });
    questionId = created.id;
  }

  // Opciones
  const labels = ["A", "B", "C", "D", "E", "F"];
  const options = Array.isArray(fm.opciones) ? fm.opciones : [];
  const correctIdx = labels.indexOf(correctLetter);

  for (let i = 0; i < options.length && i < labels.length; i++) {
    const o = options[i] || {};
    const tipo = (o.tipo || "texto").toString();
    const text = tipo === "texto" ? (o.texto || null) : null;
    let imageUrl = null;
    if (tipo === "imagen") {
      imageUrl = normalizeImagePath(o.imagen || null);
    }
    await prisma.option.create({
      data: {
        questionId,
        label: labels[i],
        text,
        imageUrl,
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
  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.error(`No existe QUESTIONS_DIR: ${QUESTIONS_DIR}`);
    process.exit(1);
  }

  const files = readAllQuestionFiles(QUESTIONS_DIR);
  if (files.length === 0) {
    console.error(`No se encontraron .md en: ${QUESTIONS_DIR}`);
    process.exit(1);
  }

  console.log(`Archivos detectados: ${files.length}. Insertando/actualizando...`);
  const exam = await upsertExam();

  let count = 0;
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    const { fm } = parseFrontMatter(raw);
    await upsertQuestionWithOptions(exam.id, fm);
    count++;
  }

  console.log(`Listo. Examen "${EXAM_TITLE}" (${EXAM_SLUG}) con ${count} preguntas importadas/actualizadas.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
