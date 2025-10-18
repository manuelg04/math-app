/* eslint-disable no-console */
"use strict";

require("dotenv").config();

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// =============== Config por ENV ===============
// Slug objetivo (existente en tu BD): queremos mantener "prueba_general"
const EXAM_SLUG = process.env.EXAM_SLUG || "prueba_general";

// Título/desc solo se usan si el slug no existe (creación)
const EXAM_TITLE = process.env.EXAM_TITLE || "Prueba General";
const EXAM_DESCRIPTION =
  process.env.EXAM_DESCRIPTION || "Prueba general con ayudas opcionales.";

// Rutas de datos generados por tu Python
const DATA_ROOT = process.env.DATA_ROOT || path.join(process.cwd(), "out");
const JSONL_FILE =
  process.env.JSONL_FILE || path.join(DATA_ROOT, "questions.jsonl");
const QMD_DIR = process.env.QMD_DIR || path.join(DATA_ROOT, "qmd");

// Dónde publicar imágenes en Next.js (carpeta pública)
const ASSETS_SUBDIR = process.env.ASSETS_SUBDIR || "images"; // mantén "images" para /exams/<slug>/images
const ASSETS_DEST_DIR = process.env.ASSETS_DEST_DIR
  || path.join(process.cwd(), "public", "exams", EXAM_SLUG, ASSETS_SUBDIR);
const ASSETS_PUBLIC_PREFIX = process.env.ASSETS_PUBLIC_PREFIX
  || path.posix.join("/exams", EXAM_SLUG, ASSETS_SUBDIR);

// Flags
const DRY_RUN = process.env.DRY_RUN === "1"; // solo validar, sin escribir ni copiar
// Estrategia cuando el examen ya existe: PURGE (borra solo preguntas/opciones) o DELETE (borra el examen)
const REPLACE_STRATEGY = (process.env.REPLACE_STRATEGY || "PURGE").toUpperCase(); // PURGE|DELETE
// Importar imágenes del ENUNCIADO desde QMD (busca ![...](...)) y reescribe rutas
const IMPORT_PROMPT_IMAGES = process.env.IMPORT_PROMPT_IMAGES === "1";
// Permitir que falten archivos de imagen (no fallar si no están)
const ALLOW_MISSING_ASSETS = process.env.ALLOW_MISSING_ASSETS !== "0"; // por defecto true

// =============== Utilidades ===============

function normalizeNewlines(s) {
  return (s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function rtrimLines(s) {
  return normalizeNewlines(s)
    .split("\n")
    .map((ln) => ln.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}
function ensureBlankLinesAroundTables(md) {
  const lines = normalizeNewlines(md).split("\n");
  const isTableLine = (ln) => /^\s*\|.*\|\s*$/.test(ln);
  const isDashLine = (ln) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(ln);

  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (isTableLine(ln)) {
      const block = [];
      if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
      while (i < lines.length && (isTableLine(lines[i]) || isDashLine(lines[i]))) {
        block.push(lines[i]);
        i++;
      }
      out.push(...block);
      if (i < lines.length && lines[i].trim() !== "") out.push("");
      continue;
    }
    out.push(ln);
    i++;
  }
  return out.join("\n").trim();
}
function normalizeMarkdown(md) {
  return ensureBlankLinesAroundTables(rtrimLines(md));
}
function codeFor(qid) {
  // para mimetizar tu BD actual, usa "Pregunta N"
  return `Pregunta ${qid}`;
}
function toOrderIndex(qid) {
  return Number(qid);
}
function assert(condition, message, ctx) {
  if (!condition) {
    const prefix = ctx ? `[Q${ctx.id}] ` : "";
    const e = new Error(prefix + message);
    e._ctx = ctx;
    throw e;
  }
}
function parseJsonl(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = normalizeNewlines(text).split("\n").filter((l) => l.trim() !== "");
  const items = [];
  for (const ln of lines) {
    try {
      items.push(JSON.parse(ln));
    } catch (e) {
      const short = ln.length > 240 ? ln.slice(0, 240) + "..." : ln;
      throw new Error(`Línea JSONL inválida:\n${short}\n${e.message}`);
    }
  }
  return items;
}
function existsSync(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}
function hashOfFile(fp) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(fp));
  return h.digest("hex").slice(0, 10);
}
function sanitizeOptionText(t) {
  return (t || "").replace(/\[Image of[^\]]*\]/gi, "").trim();
}
function isValidAnswerLetter(ch) {
  return ["A", "B", "C", "D"].includes(String(ch || "").trim().toUpperCase());
}
function validateQuestionRecord(q) {
  assert(q.id != null, "Falta 'id'", q);
  assert(q.enunciado && q.enunciado.trim().length > 0, "Falta 'enunciado'", q);
  assert(Array.isArray(q.opciones) && q.opciones.length === 4, "Debe haber 4 opciones (A-D)", q);
  const letters = new Set(q.opciones.map(o => String(o.id).toUpperCase()));
  assert(letters.size === 4 && ["A","B","C","D"].every(L => letters.has(L)), "Las opciones deben ser A,B,C,D", q);
  assert(isValidAnswerLetter(q.respuesta_correcta), "respuesta_correcta inválida", q);
  const normPrompt = normalizeMarkdown(q.enunciado || "");
  assert(normPrompt.length > 0, "Enunciado vacío tras normalización", q);
  return true;
}
function buildPromptMd(q) {
  return normalizeMarkdown(q.enunciado || "");
}
function coalesceHelps(ayudasList) {
  if (!Array.isArray(ayudasList)) return { help1: null, help2: null };
  const map = new Map();
  for (const a of ayudasList) {
    if (!a || !a.titulo) continue;
    map.set(a.titulo.trim().toLowerCase(), a.texto || "");
  }
  const help1 = map.get("ayuda 1") || null;
  let help2 = map.get("ayuda 2") || null;
  const extra = [];
  if (map.has("ayuda 3")) extra.push(`## Ayuda 3\n${map.get("ayuda 3")}`);
  if (map.has("ayuda 4")) extra.push(`## Ayuda 4\n${map.get("ayuda 4")}`);
  if (extra.length > 0) {
    const tail = extra.join("\n\n");
    help2 = help2 ? `${help2}\n\n---\n\n${tail}` : tail;
  }
  return {
    help1: help1 ? normalizeMarkdown(help1) : null,
    help2: help2 ? normalizeMarkdown(help2) : null,
  };
}
function findQmdPath(qid) {
  const p = path.join(QMD_DIR, `q${String(qid).padStart(3,"0")}.md`);
  return existsSync(p) ? p : null;
}
function parseQmdOptionsImages(qmdText) {
  // Devuelve Map<label, { mdPath }>
  const res = new Map();
  const md = normalizeNewlines(qmdText);
  const start = md.indexOf("\n# Opciones de respuesta");
  if (start === -1) return res;
  const tail = md.slice(start + 1);
  const end = tail.indexOf("\n# Ayudas");
  const block = end === -1 ? tail : tail.slice(0, end);
  const lines = block.split("\n");
  const optLine = /^\s*-\s*\*\*([A-D])\)\*\*\s*(.+?)\s*$/;
  for (const ln of lines) {
    const m = ln.match(optLine);
    if (!m) continue;
    const label = m[1].toUpperCase();
    const rest = m[2] || "";
    const img = rest.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (img) res.set(label, { mdPath: img[1] });
  }
  return res;
}
function resolveFromQmd(qmdPath, mdRel) {
  if (!mdRel) return null;
  const rel = mdRel.replace(/^\.?\/*/, "");
  // candidatos
  const candidates = [
    path.resolve(path.dirname(qmdPath), rel),
    path.resolve(path.dirname(qmdPath), "assets", rel),
    path.resolve(QMD_DIR, rel),
    path.resolve(QMD_DIR, "assets", rel),
  ];
  for (const abs of candidates) {
    if (existsSync(abs)) return abs;
  }
  return null;
}
async function copyAsset(absSrc, destDir) {
  await ensureDir(destDir);
  const base = path.basename(absSrc);
  const p = path.parse(base);
  const hash = hashOfFile(absSrc);
  const finalName = `${p.name}.${hash}${p.ext}`;
  const destAbs = path.join(destDir, finalName);
  await fsp.copyFile(absSrc, destAbs);
  return path.posix.join(ASSETS_PUBLIC_PREFIX, finalName);
}
function rewritePromptImages(md, rewriter) {
  // rewriter(absPath | null, originalUrl) -> publicUrl | null | undefined
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  return md.replace(imgRe, (_full, alt, url) => {
    const outUrl = rewriter(url);
    if (!outUrl) return `![${alt}](${url})`; // sin cambios
    return `![${alt}](${outUrl})`;
  });
}

// =============== Principal ===============
async function main() {
  console.log("=== Ingesta examen (JSONL) ===");
  console.log({
    slug: EXAM_SLUG,
    strategy: REPLACE_STRATEGY,
    DRY_RUN,
    IMPORT_PROMPT_IMAGES,
    ALLOW_MISSING_ASSETS,
    JSONL_FILE,
    QMD_DIR,
    ASSETS_DEST_DIR,
    ASSETS_PUBLIC_PREFIX,
  });

  // 1) Cargar JSONL
  if (!existsSync(JSONL_FILE)) {
    throw new Error(`No se encontró JSONL_FILE: ${JSONL_FILE}`);
  }
  const records = parseJsonl(JSONL_FILE);
  if (records.length === 0) throw new Error("JSONL vacío");

  // 2) Validar y preparar
  const errs = [];
  const prepared = [];

  for (const q of records) {
    try {
      validateQuestionRecord(q);

      const qmdPath = findQmdPath(q.id);
      let qmdText = null;
      let optImages = new Map();
      if (qmdPath) {
        qmdText = fs.readFileSync(qmdPath, "utf8");
        optImages = parseQmdOptionsImages(qmdText);
      }

      let prompt_md = buildPromptMd(q);

      // (Opcional) Importar imágenes del ENUNCIADO desde el QMD
      if (IMPORT_PROMPT_IMAGES && qmdText) {
        // Reescribe rutas de imágenes en la sección enunciado si hay ![...](...)
        prompt_md = rewritePromptImages(prompt_md, (orig) => {
          const abs = resolveFromQmd(qmdPath, orig);
          if (!abs) {
            const msg = `[Q${q.id}] Imagen de enunciado no encontrada en disco: ${orig}`;
            if (ALLOW_MISSING_ASSETS) {
              console.warn("⚠", msg);
              // Aun así, reescribimos al prefijo público manteniendo nombre base
              const base = path.posix.basename(orig);
              return path.posix.join(ASSETS_PUBLIC_PREFIX, base);
            } else {
              throw new Error(msg);
            }
          }
          if (DRY_RUN) {
            const base = path.posix.basename(abs);
            return path.posix.join(ASSETS_PUBLIC_PREFIX, base);
          }
          return copyAsset(abs, ASSETS_DEST_DIR);
        });
      }

      const { help1, help2 } = coalesceHelps(q.ayudas);

      // Opciones y respuesta correcta
      const correct = String(q.respuesta_correcta).trim().toUpperCase();
      const options = q.opciones
        .map((o) => ({
          label: String(o.id).toUpperCase(),
          text: sanitizeOptionText(o.texto),
          mdPath: optImages.get(String(o.id).toUpperCase())?.mdPath || null,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // Si hay imágenes en opciones y queremos copiarlas o, al menos, reescribir URL
      for (const o of options) {
        if (!o.mdPath) {
          o.imageUrl = null;
          continue;
        }
        const abs = qmdPath ? resolveFromQmd(qmdPath, o.mdPath) : null;
        if (!abs) {
          const msg = `[Q${q.id}] Imagen de opción ${o.label} no encontrada en disco: ${o.mdPath}`;
          if (ALLOW_MISSING_ASSETS) {
            console.warn("⚠", msg);
            // reescribe a prefijo público con el basename (tú luego subes manualmente)
            const base = path.posix.basename(o.mdPath);
            o.imageUrl = path.posix.join(ASSETS_PUBLIC_PREFIX, base);
          } else {
            throw new Error(msg);
          }
        } else if (DRY_RUN) {
          const base = path.posix.basename(abs);
          o.imageUrl = path.posix.join(ASSETS_PUBLIC_PREFIX, base);
        } else {
          o.imageUrl = await copyAsset(abs, ASSETS_DEST_DIR);
        }
      }

      prepared.push({
        id: q.id,
        orderIndex: toOrderIndex(q.id),
        code: codeFor(q.id),
        prompt_md,
        competency: q.competencia || null,
        evidence: (q.evidencia || "").trim() || null, // guarda texto completo (tu BD ya lo tiene así)
        contentArea: q.contenido || null,
        context: q.contexto || null,
        help1_md: help1,
        help2_md: help2,
        options: options.map((o) => ({
          label: o.label,
          text: o.text || null,
          imageUrl: o.imageUrl || null,
          isCorrect: o.label === correct,
        })),
      });
    } catch (e) {
      errs.push(e);
    }
  }

  if (errs.length) {
    console.error("❌ Errores de validación/preparación:");
    for (const e of errs) console.error("-", e.message);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log(`✔ Preguntas listas para ingesta: ${prepared.length}`);

  // 3) Persistencia
  if (DRY_RUN) {
    console.log("🟡 DRY_RUN=1 → no se modifica BD ni se copian más assets.");
    await prisma.$disconnect();
    return;
  }

  // buscar examen por slug
  let exam = await prisma.exam.findUnique({ where: { slug: EXAM_SLUG } });

  if (!exam) {
    // crear examen
    exam = await prisma.exam.create({
      data: {
        slug: EXAM_SLUG,
        title: EXAM_TITLE,
        description: EXAM_DESCRIPTION,
        isActive: true,
        version: 1,
      },
    });
    console.log(`✔ Creado examen '${exam.slug}' (${exam.id})`);
  } else {
    console.log(`ℹ Se usará examen existente '${exam.slug}' (${exam.id}) con estrategia: ${REPLACE_STRATEGY}`);
    if (REPLACE_STRATEGY === "DELETE") {
      console.log("⚠ Eliminando examen (cascade)...");
      await prisma.exam.delete({ where: { id: exam.id } });
      exam = await prisma.exam.create({
        data: {
          slug: EXAM_SLUG,
          title: EXAM_TITLE,
          description: EXAM_DESCRIPTION,
          isActive: true,
          version: 1,
        },
      });
      console.log(`✔ Re-creado examen '${exam.slug}' (${exam.id})`);
    } else if (REPLACE_STRATEGY === "PURGE") {
      // borra sólo preguntas (cascade elimina options/responses/aidUsages de esas preguntas)
      console.log("⚠ Purgando preguntas/opciones existentes del examen...");
      await prisma.question.deleteMany({ where: { examId: exam.id } });
      console.log("✔ Purga completada.");
    } else {
      throw new Error(`REPLACE_STRATEGY inválida: ${REPLACE_STRATEGY} (usa PURGE o DELETE)`);
    }
  }

  // crear preguntas + opciones
  for (const q of prepared.sort((a, b) => a.orderIndex - b.orderIndex)) {
    const createdQ = await prisma.question.create({
      data: {
        examId: exam.id,
        orderIndex: q.orderIndex,
        code: q.code,
        prompt: q.prompt_md,
        competency: q.competency,
        evidence: q.evidence,
        contentArea: q.contentArea,
        context: q.context,
        help1Md: q.help1_md,
        help2Md: q.help2_md,
      },
    });

    for (const o of q.options) {
      await prisma.option.create({
        data: {
          questionId: createdQ.id,
          label: o.label,
          text: o.text,
          imageUrl: o.imageUrl,
          isCorrect: o.isCorrect,
        },
      });
    }
  }

  console.log(`✔ Ingesta finalizada. Insertadas ${prepared.length} preguntas en '${EXAM_SLUG}'.`);
  console.log(`✔ Carpeta de assets (si se copiaron): ${ASSETS_DEST_DIR}`);
  await prisma.$disconnect();
}

// =============== Run ===============
main().catch(async (err) => {
  console.error("❌ Error:", err);
  process.exitCode = 1;
  await prisma.$disconnect();
});
