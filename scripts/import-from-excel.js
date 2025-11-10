// scripts/import-from-excel.js
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ENTRY_EXIT_EXAM_SLUG = process.env.ENTRY_EXIT_EXAM_SLUG || 'saberpro_exam';
const GENERAL_EXAM_SLUG = process.env.GENERAL_EXAM_SLUG || 'prueba_general';
const EXCEL_PATH = process.env.EXCEL_PATH || './preguntas-por-plan.xlsx';

function toLevel(s) {
  const t = String(s || '').trim().toLowerCase();
  if (t.startsWith('bajo')) return 'LOW';
  if (t.startsWith('medio')) return 'MEDIUM';
  if (t.startsWith('alto')) return 'HIGH';
  throw new Error(`Nivel inválido: ${s}`);
}

async function main() {
  const excelPath = path.resolve(EXCEL_PATH);
  if (!fs.existsSync(excelPath)) throw new Error(`No existe ${excelPath}`);

  const wb = xlsx.readFile(excelPath);

  const entryExam = await prisma.exam.findUniqueOrThrow({ where: { slug: ENTRY_EXIT_EXAM_SLUG }, select: { id: true, slug: true } });
  const generalExam = await prisma.exam.findUniqueOrThrow({ where: { slug: GENERAL_EXAM_SLUG }, select: { id: true, slug: true } });
  console.log(`Examen entrada/salida: ${entryExam.slug} | Examen general: ${generalExam.slug}`);

  // Hoja con totales y mínimos por plan
  const wsPlan150 = wb.Sheets['Plan de Entramento con 150 p.'] || wb.Sheets['Plan de Entramiento con 150 p.'];
  if (!wsPlan150) throw new Error('No se encontró hoja "Plan de Entramiento con 150 p."');
  const rows150 = xlsx.utils.sheet_to_json(wsPlan150, { defval: null });

  // Extract summary rows from __EMPTY_1, __EMPTY_2, __EMPTY_3 columns
  const summaryRows = rows150
    .filter(r => ['A','B','C','D','E','F','G'].includes(String(r['__EMPTY_1'] || '').trim()))
    .map(r => ({
      code: String(r['__EMPTY_1']).trim(),
      total: Number(r['__EMPTY_2']),
      minRequired: Number(r['__EMPTY_3']),
    }));

  // Upsert TrainingPlan
  const planIdByCode = new Map();
  for (const row of summaryRows) {
    const p = await prisma.trainingPlan.upsert({
      where: { code: row.code },
      update: { minRequiredToUnlockExit: row.minRequired, isActive: true },
      create: {
        code: row.code,
        title: `Plan ${row.code}`,
        description: `Plan ${row.code} del entrenamiento`,
        minRequiredToUnlockExit: row.minRequired,
        isActive: true,
      },
      select: { id: true, code: true },
    });
    planIdByCode.set(p.code, p.id);
    console.log(`Plan ${p.code} listo (min=${row.minRequired})`);
  }

  // Reglas de colocación (27 combinaciones)
  const wsCombos = wb.Sheets['Combinaciones según desempeño'];
  if (!wsCombos) throw new Error('No se encontró "Combinaciones según desempeño"');
  const combos = xlsx.utils.sheet_to_json(wsCombos, { defval: null });
  for (const r of combos) {
    const interp = toLevel(r['Interpretación']);
    const form = toLevel(r['Formulación']);
    const argu = toLevel(r['Argumentación']);
    const planCode = String(r['Plan'] || '').trim().toUpperCase();
    const trainingPlanId = planIdByCode.get(planCode);
    if (!trainingPlanId) throw new Error(`TrainingPlan no cargado: ${planCode}`);

    await prisma.placementRule.upsert({
      where: {
        examId_interpLevel_formLevel_arguLevel: {
          examId: entryExam.id,
          interpLevel: interp,
          formLevel: form,
          arguLevel: argu,
        },
      },
      update: { trainingPlanId },
      create: {
        examId: entryExam.id,
        interpLevel: interp,
        formLevel: form,
        arguLevel: argu,
        trainingPlanId,
      },
    });
  }
  console.log('Reglas de colocación importadas.');

  // Mapeo Pregunta -> Plan (examen general)
  const questionRows = rows150.filter(r => r['Plan'] && r['Pregunta'] != null);

  const generalQuestions = await prisma.question.findMany({
    where: { examId: generalExam.id },
    select: { id: true, orderIndex: true },
  });
  const qIdByOrder = new Map(generalQuestions.map(q => [q.orderIndex, q.id]));
  console.log(`Found ${generalQuestions.length} questions in ${GENERAL_EXAM_SLUG}`);

  await prisma.planQuestion.deleteMany({});
  console.log('PlanQuestion limpiado.');

  let created = 0;
  for (const r of questionRows) {
    const planCode = String(r['Plan']).trim().toUpperCase();
    const trainingPlanId = planIdByCode.get(planCode);
    if (!trainingPlanId) continue;

    const orderIndex = Number(r['Pregunta']);
    const questionId = qIdByOrder.get(orderIndex);
    if (!questionId) {
      console.warn(`⚠️  Saltando pregunta ${orderIndex} (no existe en ${GENERAL_EXAM_SLUG})`);
      continue;
    }

    await prisma.planQuestion.create({
      data: { trainingPlanId, questionId, orderIndex },
    });
    created++;
  }
  console.log(`Se insertaron ${created} PlanQuestion.`);

  // Definiciones y umbrales de categorías para el examen de entrada/salida
  const defs = [
    { key: 'INTERPRETACION', name: 'Interpretación', start: 1, end: 12, thresholds: [
      { level: 'LOW',    min: 0, max: 4 },
      { level: 'MEDIUM', min: 5, max: 8 },
      { level: 'HIGH',   min: 9, max: 12 },
    ]},
    { key: 'FORMULACION', name: 'Formulación', start: 13, end: 23, thresholds: [
      { level: 'LOW',    min: 0, max: 4 },
      { level: 'MEDIUM', min: 5, max: 8 },
      { level: 'HIGH',   min: 9, max: 11 },
    ]},
    { key: 'ARGUMENTACION', name: 'Argumentación', start: 24, end: 35, thresholds: [
      { level: 'LOW',    min: 0, max: 4 },
      { level: 'MEDIUM', min: 5, max: 8 },
      { level: 'HIGH',   min: 9, max: 12 },
    ]},
  ];

  for (const d of defs) {
    const def = await prisma.entryCategoryDefinition.upsert({
      where: { examId_key: { examId: entryExam.id, key: d.key } },
      update: { name: d.name, orderStart: d.start, orderEnd: d.end },
      create: { examId: entryExam.id, key: d.key, name: d.name, orderStart: d.start, orderEnd: d.end },
      select: { id: true },
    });
    for (const th of d.thresholds) {
      await prisma.entryCategoryThreshold.upsert({
        where: { categoryDefinitionId_level: { categoryDefinitionId: def.id, level: th.level } },
        update: { minPointsInclusive: th.min, maxPointsInclusive: th.max },
        create: { categoryDefinitionId: def.id, level: th.level, minPointsInclusive: th.min, maxPointsInclusive: th.max },
      });
    }
  }
  console.log('Definiciones y umbrales de categorías listos.');
  console.log('¡Importación completa!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
