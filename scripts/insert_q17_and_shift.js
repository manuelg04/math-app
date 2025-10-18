/* eslint-disable no-console */
"use strict";

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ========= Config =========
const EXAM_SLUG = process.env.EXAM_SLUG || "prueba_general";
const INSERT_AT = Number(process.env.INSERT_AT || 17);
const BIG_SHIFT = Number(process.env.BIG_SHIFT || 1000); // desplazamiento temporal grande
const DRY_RUN = process.env.DRY_RUN === "1";

// ========= Utilidades =========
function normalizeTables(md) {
  const lines = (md || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const isTableLine = (ln) => /^\s*\|.*\|\s*$/.test(ln);
  const isDashLine  = (ln) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(ln);

  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (isTableLine(ln)) {
      if (out.length && out[out.length - 1].trim() !== "") out.push("");
      const block = [];
      while (i < lines.length && (isTableLine(lines[i]) || isDashLine(lines[i]))) {
        block.push(lines[i]); i++;
      }
      out.push(...block);
      if (i < lines.length && lines[i].trim() !== "") out.push("");
    } else {
      out.push(ln); i++;
    }
  }
  return out.join("\n").trim();
}

function buildNewQ17() {
  const promptMd = normalizeTables(
`En un programa de riego comunitario de huertas se probaron cuatro bombas cuya capacidad horaria, en metros cúbicos por hora, se muestra en la siguiente tabla:

| Bomba               | Capacidad (m³/h) |
|---------------------|------------------|
| Bomba del río       | 5/6              |
| Bomba del lago      | 5/8              |
| Bomba del manantial | 6/5              |
| Bomba de la tierra  | 5/9              |

De acuerdo con la información de la tabla, ¿cuál de las siguientes afirmaciones es verdadera?`
  );

  const help1 = 
`Comparación de fracciones  
Para comparar fracciones, puedes:  
- Convertirlas a números decimales, o  
- Buscar un denominador común.  
El valor mayor corresponde a la fracción cuyo cociente es mayor.  

Transformación a decimal  
5/6 ≈ 0,833  
5/8 = 0,625  
6/5 = 1,2  
5/9 ≈ 0,556  

Interpretación práctica  
Cada fracción representa los metros cúbicos de agua por hora que bombea cada bomba.  
La bomba de mayor valor decimal es la de mayor capacidad.  

Errores comunes  
- Suponer que un denominador más grande significa automáticamente más capacidad.  
- Olvidar simplificar o convertir a decimal para comparar.  
- Comparar solo numeradores o solo denominadores.`;

  const help2 = 
`Paso 1. Ordenar las capacidades  
6/5 (1,2) > 5/6 (0,833) > 5/8 (0,625) > 5/9 (0,556)  

Paso 2. Revisar las opciones  
- La bomba de mayor capacidad es la de la tierra. ❌ Incorrecto, es la menor.  
- La capacidad de la bomba del lago es menor que la de la bomba de la tierra. ❌ Incorrecto, 0,625 > 0,556.  
- **La bomba de mayor capacidad es la del manantial. ✅ Correcto, 1,2 es la mayor.**  
- La capacidad de la bomba del río es mayor que la de la bomba del manantial. ❌ Incorrecto, 0,833 < 1,2.  

**Respuesta final**  
✅ La afirmación verdadera es: La bomba de mayor capacidad es la del manantial.`;

  return {
    competency: "Interpretación y representación",
    evidence: "I1. El estudiante da cuenta de las características básicas de la información presentada en formatos como series, gráficas, tablas y esquemas.",
    contentArea: "Álgebra y Cálculo",
    context: "Comunitario o social",
    prompt: promptMd,
    help1Md: help1,
    help2Md: help2,
    options: [
      { label: "A", text: "La bomba de mayor capacidad es la de la tierra.", isCorrect: false },
      { label: "B", text: "La capacidad de la bomba del lago es menor que la de la bomba de la tierra.", isCorrect: false },
      { label: "C", text: "La bomba de mayor capacidad es la del manantial.", isCorrect: true },
      { label: "D", text: "La capacidad de la bomba del río es mayor que la de la bomba del manantial.", isCorrect: false },
    ],
  };
}

async function main() {
  console.log("=== Insertar Pregunta 17 y desplazar restantes ===");
  console.log({ EXAM_SLUG, INSERT_AT, BIG_SHIFT, DRY_RUN });

  const exam = await prisma.exam.findUnique({ where: { slug: EXAM_SLUG } });
  if (!exam) {
    throw new Error(`No existe examen con slug='${EXAM_SLUG}'`);
  }

  const countBefore = await prisma.question.count({ where: { examId: exam.id } });
  console.log(`Preguntas actuales: ${countBefore}`);

  // Idempotencia: si ya hay una #17 "bombas", salimos.
  const q17Existing = await prisma.question.findFirst({
    where: { examId: exam.id, orderIndex: INSERT_AT },
    select: { id: true, prompt: true, code: true },
  });

  if (q17Existing && /programa de riego comunitario|Bomba del manantial/i.test(q17Existing.prompt || "")) {
    console.log("✔ Ya existe una pregunta 17 de 'bombas'. No se realizan cambios.");
    await prisma.$disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log("🟡 DRY_RUN=1 → no se realizarán cambios.");
    await prisma.$disconnect();
    return;
  }

  // Transacción atómica
  const result = await prisma.$transaction(async (tx) => {
    // 1) Abrir hueco: subir >= INSERT_AT en +BIG_SHIFT
    const shiftedUp = await tx.$executeRaw`
      UPDATE questions
      SET order_index = order_index + ${BIG_SHIFT}
      WHERE exam_id = ${exam.id} AND order_index >= ${INSERT_AT}
    `;
    console.log(`↑ Desplazadas temporalmente: ${shiftedUp}`);

    // 2) Insertar nueva pregunta en 'INSERT_AT'
    const newData = buildNewQ17();
    const createdQ = await tx.question.create({
      data: {
        examId: exam.id,
        orderIndex: INSERT_AT,
        code: `Pregunta ${INSERT_AT}`,
        prompt: newData.prompt,
        competency: newData.competency,
        evidence: newData.evidence,
        contentArea: newData.contentArea,
        context: newData.context,
        help1Md: newData.help1Md,
        help2Md: newData.help2Md,
      },
      select: { id: true },
    });

    for (const opt of newData.options) {
      await tx.option.create({
        data: {
          questionId: createdQ.id,
          label: opt.label,
          text: opt.text,
          isCorrect: !!opt.isCorrect,
          imageUrl: null,
        },
      });
    }

    // 3) Bajar las temporalmente subidas: - (BIG_SHIFT - 1) → neto +1
    const shiftedDown = await tx.$executeRaw`
      UPDATE questions
      SET order_index = order_index - ${BIG_SHIFT - 1}
      WHERE exam_id = ${exam.id} AND order_index >= ${INSERT_AT + BIG_SHIFT}
    `;
    console.log(`↓ Recolocadas: ${shiftedDown}`);

    return { createdQId: createdQ.id };
  });

  console.log(`✔ Insertada nueva P${INSERT_AT} (id=${result.createdQId}).`);

  // 4) Reajustar 'code' = "Pregunta X" fuera de la transacción (más rápido)
  console.log("Actualizando códigos de preguntas...");
  const all = await prisma.question.findMany({
    where: { examId: exam.id },
    select: { id: true, orderIndex: true, code: true },
    orderBy: { orderIndex: "asc" },
  });

  for (const q of all) {
    const desired = `Pregunta ${q.orderIndex}`;
    if (q.code !== desired) {
      await prisma.question.update({
        where: { id: q.id },
        data: { code: desired },
      });
    }
  }

  console.log(`✔ Códigos actualizados. Total preguntas: ${all.length}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Error:", err);
  process.exitCode = 1;
  await prisma.$disconnect();
});
