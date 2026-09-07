#!/usr/bin/env node
/* eslint-disable no-console */

//
// Sincroniza SOLO metadata (competency, evidence, content_area, context)
// para preguntas 61–120 del examen "prueba_general" desde Markdown.
// No toca otros campos.
//
// Uso:
//   node scripts/sync_prueba_general_61_120_meta_from_md.js            // actualiza solo NULLs
//   node scripts/sync_prueba_general_61_120_meta_from_md.js --force    // sobrescribe aunque no sean NULL
//   DEBUG_PARSE=1 node scripts/sync_prueba_general_61_120_meta_from_md.js
//

try { require('dotenv').config(); } catch (_) {}

const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEBUG_PARSE = process.env.DEBUG_PARSE === '1';

// ------------------ Utilidades de parseo robustas ------------------

function normalizeMd(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '  ');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSection(block, headerTitle) {
  // Localiza "### {headerTitle}" (con/sin ":") y retorna contenido hasta el próximo "### "
  const headerRe = new RegExp(`^###\\s+${escapeRegExp(headerTitle)}\\s*:?\\s*$`, 'im');
  const m = headerRe.exec(block);
  if (!m) return null;

  const startLineEnd = block.indexOf('\n', m.index);
  const start = startLineEnd === -1 ? block.length : startLineEnd + 1;

  const rest = block.slice(start);
  const nextHeaderRe = /^###\s+/im;
  const n = nextHeaderRe.exec(rest);

  const end = n ? start + n.index : block.length;
  const text = block.slice(start, end);
  return { start, end, text };
}

function extractSection(block, title) {
  const sec = findSection(block, title);
  return sec ? sec.text.trim() : null;
}

function splitIntoQuestionBlocks(markdown) {
  // Separa por '## Pregunta N'
  const re = /^##\s+Pregunta\s+\d+.*$/gim;
  const indices = [];
  let m;
  while ((m = re.exec(markdown)) !== null) {
    indices.push(m.index);
  }
  const blocks = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : markdown.length;
    blocks.push(markdown.slice(start, end).trim());
  }
  return blocks;
}

function extractOrderIndex(block) {
  const m = block.match(/^##\s+Pregunta\s+(\d+)/im);
  return m ? parseInt(m[1], 10) : null;
}

function parseMetaFromBlock(block) {
  const orderIndex = extractOrderIndex(block);
  const competencia = extractSection(block, 'Competencia');
  const evidencia = extractSection(block, 'Evidencia');
  const contenido = extractSection(block, 'Contenido');
  const contexto = extractSection(block, 'Contexto');

  const meta = {
    orderIndex,
    competencia: competencia || null,
    evidencia: evidencia || null,
    contenido: contenido || null,
    contexto: contexto || null,
  };

  if (DEBUG_PARSE) {
    const missing = [];
    if (!meta.competencia) missing.push('Competencia');
    if (!meta.evidencia) missing.push('Evidencia');
    if (!meta.contenido) missing.push('Contenido');
    if (!meta.contexto) missing.push('Contexto');
    if (missing.length) {
      console.warn(`[DEBUG] P${orderIndex}: faltan -> ${missing.join(', ')}`);
      for (const k of missing) {
        const sec = findSection(block, k);
        console.warn(`[DEBUG] Sección leída para "${k}" (P${orderIndex}):\n${sec ? sec.text.slice(0, 200) : '(no encontrada)'}\n---`);
      }
    }
  }

  return meta;
}

// ------------------ Lógica principal ------------------

async function readMarkdown(fileArg) {
  // Permite pasar la ruta por CLI; si no, intenta md y luego mg en /data
  const defaultMd = path.resolve(__dirname, '../data/preguntas_61_120.md');
  const defaultMg = path.resolve(__dirname, '../data/preguntas_61_120.mg');

  const tryPaths = [];
  if (fileArg) tryPaths.push(path.resolve(process.cwd(), fileArg));
  tryPaths.push(defaultMd, defaultMg);

  let lastErr = null;
  for (const p of tryPaths) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      console.log(`Usando archivo: ${p}`);
      return raw;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No se pudo leer el archivo Markdown.');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = { force: false, file: null };
  for (const a of args) {
    if (a === '--force') cfg.force = true;
    else if (a.startsWith('--file=')) cfg.file = a.slice('--file='.length);
    else if (!cfg.file && !a.startsWith('--')) cfg.file = a;
  }
  return cfg;
}

async function main() {
  const { force, file } = parseArgs();
  console.log('==> Sincronización de metadata (P61–P120) en "prueba_general"');
  console.log(`Modo: ${force ? 'FORZAR sobrescritura' : 'solo actualizar NULLs'}`);

  const exam = await prisma.exam.findUnique({ where: { slug: 'prueba_general' } });
  if (!exam) {
    console.error('ERROR: No se encontró examen con slug "prueba_general".');
    process.exit(1);
  }
  console.log(`Examen: id=${exam.id} | title="${exam.title}" | version=${exam.version}`);

  const raw = await readMarkdown(file);
  const md = normalizeMd(raw);

  const blocks = splitIntoQuestionBlocks(md);
  console.log(`Bloques detectados: ${blocks.length}`);

  // Parsear metadatos por pregunta
  const metas = blocks
    .map(parseMetaFromBlock)
    .filter((m) => typeof m.orderIndex === 'number' && m.orderIndex >= 61 && m.orderIndex <= 120);

  console.log(`Metas parseadas en rango 61–120: ${metas.length}`);

  // Leer estado actual en DB
  const rows = await prisma.question.findMany({
    where: {
      examId: exam.id,
      orderIndex: { gte: 61, lte: 120 },
    },
    select: {
      id: true,
      orderIndex: true,
      competency: true,
      evidence: true,
      contentArea: true,
      context: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const dbByOrder = new Map(rows.map((r) => [r.orderIndex, r]));
  const metaByOrder = new Map(metas.map((m) => [m.orderIndex, m]));

  // Contadores
  let updated = 0;
  let skippedNoChange = 0;
  let skippedNoMeta = 0;
  let missingInDb = 0;

  for (let oi = 61; oi <= 120; oi++) {
    const db = dbByOrder.get(oi);
    const meta = metaByOrder.get(oi);

    if (!db) {
      console.warn(`⚠ P${oi}: NO existe en la base (se omite).`);
      missingInDb += 1;
      continue;
    }
    if (!meta) {
      console.warn(`⚠ P${oi}: No se encontró metadata en el Markdown (se omite).`);
      skippedNoMeta += 1;
      continue;
    }

    const updateData = {};

    const want = {
      competency: meta.competencia,
      evidence: meta.evidencia,
      contentArea: meta.contenido,
      context: meta.contexto,
    };

    for (const [field, newVal] of Object.entries(want)) {
      if (newVal == null || String(newVal).trim() === '') {
        // Nada que escribir si en MD no está
        continue;
      }
      const current = db[field];
      if (force) {
        if (current !== newVal) updateData[field] = newVal;
      } else {
        if (current == null) updateData[field] = newVal; // solo completa NULLs
      }
    }

    if (Object.keys(updateData).length === 0) {
      skippedNoChange += 1;
      console.log(`· P${oi}: sin cambios (${force ? 'ya coincide o no hay nuevo valor' : 'no hay NULLs por completar'})`);
      continue;
    }

    await prisma.question.update({
      where: { id: db.id },
      data: updateData,
    });

    updated += 1;
    const fields = Object.keys(updateData).join(', ');
    console.log(`✔ P${oi}: actualizado -> ${fields}`);
  }

  // Verificación: ¿queda alguien con campos NULL?
  const remaining = await prisma.question.findMany({
    where: {
      examId: exam.id,
      orderIndex: { gte: 61, lte: 120 },
      OR: [
        { competency: null },
        { evidence: null },
        { contentArea: null },
        { context: null },
      ],
    },
    select: { orderIndex: true, competency: true, evidence: true, contentArea: true, context: true },
    orderBy: { orderIndex: 'asc' },
  });

  console.log('—'.repeat(70));
  console.log('RESUMEN');
  console.log(`Actualizados: ${updated}`);
  console.log(`Sin cambios: ${skippedNoChange}`);
  console.log(`Sin metadata en MD: ${skippedNoMeta}`);
  console.log(`No encontrados en DB: ${missingInDb}`);
  console.log(`Preguntas con campos aún NULL: ${remaining.length}`);
  if (remaining.length) {
    console.log('Listado (primeros 20):');
    for (const r of remaining.slice(0, 20)) {
      const missing = [];
      if (r.competency == null) missing.push('competency');
      if (r.evidence == null) missing.push('evidence');
      if (r.contentArea == null) missing.push('content_area');
      if (r.context == null) missing.push('context');
      console.log(` - P${r.orderIndex}: faltan -> ${missing.join(', ')}`);
    }
  }
  console.log('==> Fin de sincronización.');
}

main()
  .catch((e) => {
    console.error('ERROR FATAL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
