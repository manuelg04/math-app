#!/usr/bin/env node
/* eslint-disable no-console */

//
// Seed preguntas 121–150 para el examen "prueba_general" desde Markdown
// Requisitos: Prisma configurado y DATABASE_URL disponible en el entorno.
// Ejecución: node scripts/seed_prueba_general_121_150_from_md.js
//

// Cargar variables de entorno si existe dotenv (no obligatorio)
try {
    require('dotenv').config();
  } catch (_) {}
  
  const fs = require('fs/promises');
  const path = require('path');
  const { PrismaClient } = require('@prisma/client');
  
  const prisma = new PrismaClient();
  
  const DEBUG_PARSE = process.env.DEBUG_PARSE === '1';
  
  // ---------- Utilidades de parseo seguras (sin anclas no soportadas) ----------
  
  function normalizeMd(s) {
    // Unificar saltos de línea y recortar tabs
    return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '  ');
  }
  
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  function findSection(block, headerTitle) {
    // Encuentra "### {headerTitle}" (con o sin ":" al final) y devuelve {start,end,text}
    // Implementado sin lookaheads de fin de string para evitar falsos positivos.
    const headerRe = new RegExp(
      `^###\\s+${escapeRegExp(headerTitle)}\\s*:?\\s*$`,
      'im'
    );
    const m = headerRe.exec(block);
    if (!m) return null;
  
    // inicio del contenido = primer salto de línea después del encabezado encontrado
    const startLineEnd = block.indexOf('\n', m.index);
    const start = startLineEnd === -1 ? block.length : startLineEnd + 1;
  
    // buscar el siguiente encabezado de nivel 3 "### " dentro del resto del bloque
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
  
  function extractHeaderQuestionNumber(block) {
    const m = block.match(/^##\s+Pregunta\s+(\d+)/im);
    if (!m) return null;
    return parseInt(m[1], 10);
  }
  
  function parseCorrectAnswerLetter(s) {
    if (!s) return null;
    const m = s.match(/[A-D]/i);
    return m ? m[0].toUpperCase() : null;
  }
  
  // Parser robusto de opciones (A–D) por líneas.
  // Soporta "- ", "* ", "• ", "**A.**", "A.", "A)", con o sin espacios después del punto/paréntesis.
  // Mantiene texto multilínea.
  function parseOptions(block) {
    let sec = findSection(block, 'Opciones de respuesta');
    if (!sec) sec = findSection(block, 'Opciones'); // fallback si cambia el título
    if (!sec) return null;
  
    const raw = sec.text;
    const lines = raw.split('\n');
  
    const map = {};
    let currentLabel = null;
    let buffer = [];
  
    // Incluye viñetas comunes y negritas, admite "A." o "A)" y espacios opcionales luego
    const startRegex = /^\s*(?:[-*•]\s*)?(?:\*\*)?([A-Da-d])(?:\s*[\.)])?(?:\*\*)?\s*/;
  
    for (const rawLine of lines) {
      // Reemplazar NBSP y similares por espacio normal para evitar sorpresas
      const line = rawLine.replace(/\u00A0/g, ' ').replace(/\r/g, '');
      const m = line.match(startRegex);
      if (m) {
        // cerrar opción anterior
        if (currentLabel) {
          map[currentLabel] = buffer.join('\n').trim();
          buffer = [];
        }
        currentLabel = m[1].toUpperCase();
        buffer.push(line.replace(startRegex, ''));
      } else if (currentLabel) {
        buffer.push(line);
      }
    }
  
    if (currentLabel) {
      map[currentLabel] = buffer.join('\n').trim();
    }
  
    // Normalizar espacios
    for (const k of Object.keys(map)) {
      map[k] = map[k].trim();
    }
  
    return Object.keys(map).length ? map : null;
  }
  
  function parseQuestionBlock(block) {
    const orderIndex = extractHeaderQuestionNumber(block);
    const competencia = extractSection(block, 'Competencia');
    const evidencia = extractSection(block, 'Evidencia');
    const contenido = extractSection(block, 'Contenido');
    const contexto = extractSection(block, 'Contexto');
    const respuestaCorrecta = parseCorrectAnswerLetter(
      extractSection(block, 'Respuesta correcta')
    );
    const enunciado = extractSection(block, 'Enunciado');
    const ayuda1 = extractSection(block, 'Ayuda 1');
    const ayuda2 = extractSection(block, 'Ayuda 2');
    const opciones = parseOptions(block);
  
    return {
      orderIndex,
      competencia,
      evidencia,
      contenido,
      contexto,
      correctLabel: respuestaCorrecta,
      promptMd: enunciado,
      help1Md: ayuda1,
      help2Md: ayuda2,
      optionsMap: opciones,
      _rawOptionsPreview: opciones ? null : (findSection(block, 'Opciones de respuesta') || { text: '' }).text
    };
  }
  
  function splitIntoQuestionBlocks(markdown) {
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
  
  function validateParsed(q) {
    const errors = [];
    if (typeof q.orderIndex !== 'number' || Number.isNaN(q.orderIndex)) {
      errors.push('orderIndex ausente');
    }
    if (!q.promptMd) errors.push('Enunciado ausente');
    if (!q.optionsMap) {
      errors.push('Opciones ausentes');
    } else {
      ['A', 'B', 'C', 'D'].forEach((k) => {
        if (!q.optionsMap[k]) errors.push(`Opción ${k} ausente`);
      });
    }
    if (!q.correctLabel) errors.push('Respuesta correcta ausente');
    if (q.correctLabel && q.optionsMap && !q.optionsMap[q.correctLabel]) {
      errors.push(`La respuesta correcta ${q.correctLabel} no existe en opciones`);
    }
    return errors;
  }
  
  // ---------- Persistencia ----------
  
  async function upsertQuestionWithOptions(tx, examId, q) {
    const existing = await tx.question.findUnique({
      where: { examId_orderIndex: { examId, orderIndex: q.orderIndex } },
      select: { id: true },
    });
  
    const question = await tx.question.upsert({
      where: { examId_orderIndex: { examId, orderIndex: q.orderIndex } },
      create: {
        examId,
        orderIndex: q.orderIndex,
        code: null,
        prompt: q.promptMd,
        competency: q.competencia || null,
        evidence: q.evidencia || null,
        contentArea: q.contenido || null,
        context: q.contexto || null,
        help1Md: q.help1Md || null,
        help2Md: q.help2Md || null,
      },
      update: {
        prompt: q.promptMd,
        competency: q.competencia || null,
        evidence: q.evidencia || null,
        contentArea: q.contenido || null,
        context: q.contexto || null,
        help1Md: q.help1Md || null,
        help2Md: q.help2Md || null,
      },
    });
  
    const optionLabels = ['A', 'B', 'C', 'D'];
    for (const label of optionLabels) {
      const text = q.optionsMap[label] || null;
      if (!text) continue;
      await tx.option.upsert({
        where: { questionId_label: { questionId: question.id, label } },
        create: {
          questionId: question.id,
          label,
          text,
          isCorrect: q.correctLabel === label,
        },
        update: {
          text,
          isCorrect: q.correctLabel === label,
        },
      });
    }
  
    const countOptions = await tx.option.count({ where: { questionId: question.id } });
    const countCorrect = await tx.option.count({
      where: { questionId: question.id, isCorrect: true },
    });
  
    return {
      questionId: question.id,
      created: !existing,
      updated: !!existing,
      optionsCount: countOptions,
      correctCount: countCorrect,
    };
  }
  
  // ---------- Main ----------
  
  async function main() {
    const MD_FILE = path.resolve(__dirname, '../data/preguntas_121_150.md');
  
    console.log('==> Inicio de carga de preguntas 121–150 (prueba_general)');
    console.log(`Archivo: ${MD_FILE}`);
  
    const exam = await prisma.exam.findUnique({
      where: { slug: 'prueba_general' },
    });
  
    if (!exam) {
      console.error('ERROR: No se encontró el examen con slug "prueba_general".');
      process.exit(1);
    }
  
    console.log(
      `Examen encontrado: id=${exam.id} | title="${exam.title}" | version=${exam.version}`
    );
  
    const raw = await fs.readFile(MD_FILE, 'utf8');
    const md = normalizeMd(raw);
  
    const blocks = splitIntoQuestionBlocks(md);
    console.log(`Bloques detectados en el archivo: ${blocks.length}`);
    if (!blocks.length) {
      console.error('ERROR: No se detectaron bloques de preguntas en el Markdown.');
      process.exit(1);
    }
  
    const parsed = [];
    const parseErrors = [];
  
    for (const block of blocks) {
      const q = parseQuestionBlock(block);
      const errs = validateParsed(q);
      if (errs.length) {
        if (DEBUG_PARSE) {
          const preview =
            q._rawOptionsPreview && q._rawOptionsPreview.trim()
              ? q._rawOptionsPreview.split('\n').slice(0, 12).join('\n')
              : '(sin contenido leído para "Opciones de respuesta")';
          console.warn(`\n[DEBUG] Opciones leídas (Pregunta ${q.orderIndex ?? '?'})\n${preview}\n---\n`);
        }
        parseErrors.push({ orderIndex: q.orderIndex ?? '¿?', errors: errs });
      } else {
        parsed.push(q);
      }
    }
  
    const inRange = parsed.filter(
      (q) => typeof q.orderIndex === 'number' && q.orderIndex >= 121 && q.orderIndex <= 150
    );
    const outOfRange = parsed.filter(
      (q) => typeof q.orderIndex === 'number' && (q.orderIndex < 121 || q.orderIndex > 150)
    );
  
    console.log(
      `Preguntas parseadas válidas: total=${parsed.length} | en_rango_121_150=${inRange.length} | fuera_de_rango=${outOfRange.length}`
    );
  
    if (parseErrors.length) {
      console.warn('ADVERTENCIA: Se encontraron errores de parseo:');
      for (const e of parseErrors) {
        console.warn(` - Pregunta ${e.orderIndex}: ${e.errors.join('; ')}`);
      }
    }
  
    if (!inRange.length) {
      console.error('ERROR: No hay preguntas válidas en el rango 121–150 para cargar.');
      process.exit(1);
    }
  
    // Persistencia secuencial con logs
    let createdCount = 0;
    let updatedCount = 0;
    let okQuestions = 0;
    const failures = [];
  
    for (const q of inRange) {
      try {
        const res = await prisma.$transaction(async (tx) => {
          return upsertQuestionWithOptions(tx, exam.id, q);
        });
  
        const ok =
          res.optionsCount === 4 && res.correctCount === 1 && (res.created || res.updated);
        if (res.created) createdCount += 1;
        if (res.updated) updatedCount += 1;
        if (ok) okQuestions += 1;
  
        console.log(
          `✔ Pregunta ${q.orderIndex} ${
            res.created ? 'CREADA' : 'ACTUALIZADA'
          } | opciones=${res.optionsCount} | correctas=${res.correctCount}`
        );
        if (!ok) {
          console.warn(
            `   -> Verificación fallida en Pregunta ${q.orderIndex} (opciones=${res.optionsCount}, correctas=${res.correctCount})`
          );
        }
      } catch (err) {
        failures.push({ orderIndex: q.orderIndex, error: err?.message || String(err) });
        console.error(`✖ Error en Pregunta ${q.orderIndex}: ${err?.message || err}`);
      }
    }
  
    // Resumen final
    console.log('—'.repeat(70));
    console.log('RESUMEN DE CARGA');
    console.log(`Examen: ${exam.slug} (${exam.id})`);
    console.log(`Rango esperado: 121–150 (30 preguntas)`);
    console.log(`Procesadas: ${inRange.length}`);
    console.log(`Creadas: ${createdCount}`);
    console.log(`Actualizadas: ${updatedCount}`);
    console.log(`Verificadas OK (4 opciones y 1 correcta): ${okQuestions}`);
    if (failures.length) {
      console.log(`Fallidas: ${failures.length}`);
      for (const f of failures) {
        console.log(` - Pregunta ${f.orderIndex}: ${f.error}`);
      }
    } else {
      console.log('Fallidas: 0');
    }
  
    if (inRange.length !== 30) {
      console.warn(
        `ADVERTENCIA: El número de preguntas en el rango (121–150) es ${inRange.length}, se esperaban 30.`
      );
    }
  
    console.log('==> Proceso finalizado.');
  }
  
  main()
    .catch((e) => {
      console.error('ERROR FATAL:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  