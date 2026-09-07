import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const normalize = (value) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$")
    .trim();

function parse(file, bank) {
  const input = fs
    .readFileSync(path.join(root, "data", file), "utf8")
    .replace(/\r\n?/g, "\n");
  const blocks = [
    ...input.matchAll(
      /^#{1,3}\s+Pregunta\s+(\d+)\s*\n([\s\S]*?)(?=^#{1,3}\s+Pregunta\s+\d+\s*\n|$(?![\s\S]))/gm,
    ),
  ];
  return blocks.map((match) => {
    const number = Number(match[1]);
    let rawBody = match[2];
    if (bank === "training" && number === 119)
      rawBody = rawBody
        .slice(
          rawBody.indexOf(
            "Competencia Argumentación",
            rawBody.indexOf("Then question 119"),
          ),
        )
        .replace(
          /^Competencia Argumentación.*$/m,
          "### Competencia\nArgumentación",
        )
        .replace(
          /^(Evidencia|Contenido|Contexto|Respuesta correcta) (.+)$/gm,
          "### $1\n$2",
        )
        .replace(
          /^(Enunciado|Opciones de respuesta|Ayuda 1|Ayuda 2)\s*$/gm,
          "### $1",
        )
        .replace(/^AYUDAS\s*$/gm, "");
    const body = rawBody.replace(/^\*\*([^*]+):\*\*\s*/gm, "### $1\n");
    const sections = [
      ...body.matchAll(
        /^#{1,5}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,5}\s+|$(?![\s\S]))/gm,
      ),
    ];
    const values = Object.fromEntries(
      sections.map((m) => [
        m[1].trim().replace(/:$/, "").toLowerCase(),
        normalize(m[2]),
      ]),
    );
    const optionBlock =
      values["opciones de respuesta"] || values.opciones || "";
    let choices = [
      ...optionBlock.matchAll(
        /^\s*(?:[-*]\s+)?(?:\*\*)?([A-D])[.)](?:\*\*)?\s*([\s\S]*?)(?=^\s*(?:[-*]\s+)?(?:\*\*)?[A-D][.)]|$(?![\s\S]))/gm,
      ),
    ].map((m) => ({
      label: m[1],
      text: normalize(m[2]).replace(/\n---\s*$/, ""),
    }));
    if (!choices.length)
      choices = [...optionBlock.matchAll(/^[-*]\s+(.+)$/gm)].map((m, i) => ({
        label: "ABCD"[i],
        text: normalize(m[1]),
      }));
    const correct = (values["respuesta correcta"] || "").match(/^[A-D]/)?.[0];
    if (
      !values.enunciado ||
      choices.length !== 4 ||
      !correct ||
      choices.some((c) => !c.text)
    )
      throw new Error(
        `${file}: invalid question ${number}, choices=${choices.length}`,
      );
    return {
      key: `${bank}:${number}`,
      bank,
      number,
      prompt: values.enunciado,
      choices,
      correct,
      competency: values.competencia || "",
      contentArea: values.contenido || "",
      help1: values["ayuda 1"] || "",
      help2: values["ayuda 2"] || "",
    };
  });
}

const questions = [
  ...parse("prueba_entrada_salida.md", "entry"),
  ...parse("preguntas_60.md", "training"),
  ...parse("preguntas_61_120.md", "training"),
  ...parse("preguntas_121_150.md", "training"),
];
for (const q of questions)
  if (q.bank === "training" && q.number >= 54 && q.number <= 56) {
    q.number += 1;
    q.key = `training:${q.number}`;
    if (q.number === 56) q.correct = "A";
    if (q.number === 57) q.correct = "C";
  }
questions.push({
  key: "training:54",
  bank: "training",
  number: 54,
  competency: "Formulación y Ejecución",
  contentArea: "Álgebra y Cálculo",
  correct: "C",
  prompt:
    "El cajero de una tienda organiza monedas en grupos de 10. Obtiene 15 grupos de monedas de $100 y sobran 4 monedas; 18 grupos de $200 y sobran 8; 9 grupos de $500 y sobran 2; y 6 grupos de $1.000, sin sobrantes. ¿Qué expresión determina el total de dinero?",
  choices: [
    { label: "A", text: "19 × $100 + 26 × $200 + 11 × $500 + 6 × $1.000" },
    { label: "B", text: "150 × $100 + 180 × $200 + 90 × $500 + 60 × $1.000" },
    { label: "C", text: "154 × $100 + 188 × $200 + 92 × $500 + 60 × $1.000" },
    { label: "D", text: "15 × $100 + 18 × $200 + 9 × $500 + 6 × $1.000" },
  ],
  help1:
    "Multiplica cada cantidad de grupos por 10 y suma las monedas sobrantes. Luego multiplica por la denominación.",
  help2:
    "Las cantidades son 15 × 10 + 4 = 154, 18 × 10 + 8 = 188, 9 × 10 + 2 = 92 y 6 × 10 = 60. La expresión correcta es C.",
});
questions.find((q) => q.key === "training:97").choices[3].text =
  "El promedio correcto es 9.000 pasos: se registraron 45.000 pasos en cinco días.";
questions.sort((a, b) => a.bank.localeCompare(b.bank) || a.number - b.number);
for (const [bank, count] of [
  ["entry", 35],
  ["training", 150],
]) {
  const numbers = questions
    .filter((q) => q.bank === bank)
    .map((q) => q.number)
    .sort((a, b) => a - b);
  if (numbers.length !== count || numbers.some((n, i) => n !== i + 1))
    throw new Error(`Incomplete ${bank} catalog: ${numbers.length}`);
}
const wb = JSON.parse(
  execFileSync(
    "python3",
    [
      "scripts/read-workbook.py",
      path.join(root, "data/preguntas-por-plan.xlsx"),
    ],
    { encoding: "utf8" },
  ),
);
const rows = wb["Plan de Entramiento con 150 p."];
const plans = rows
  .filter((r) => /^[A-G]$/.test(String(r.__EMPTY_1 || "").trim()))
  .map((r) => ({
    code: String(r.__EMPTY_1).trim(),
    minimum: Number(r.__EMPTY_3),
    questions: rows
      .filter(
        (q) =>
          String(q.Plan).trim() === String(r.__EMPTY_1).trim() &&
          q.Pregunta != null,
      )
      .map((q) => `training:${Number(q.Pregunta)}`),
  }));
const level = (s) =>
  ({ bajo: "LOW", medio: "MEDIUM", alto: "HIGH" })[
    String(s).trim().toLowerCase()
  ];
const workbookRules = wb["Combinaciones según desempeño"].map((r) => ({
  levels: [
    level(r.Interpretación),
    level(r.Formulación),
    level(r.Argumentación),
  ].join(":"),
  plan: String(r.Plan).trim(),
  reason: String(r["Justificación breve"] || ""),
}));
const rules = [
  ...new Map(workbookRules.map((r) => [r.levels, r])).values(),
  {
    levels: "HIGH:MEDIUM:MEDIUM",
    plan: "E",
    reason:
      "Fortaleza en interpretación; refuerzo de formulación y argumentación. Regla completada con aprobación del responsable del proyecto.",
  },
];
if (
  plans.length !== 7 ||
  rules.length !== 27 ||
  new Set(rules.map((r) => r.levels)).size !== 27
)
  throw new Error("Incomplete plans/rules");
const keys = new Set(questions.map((q) => q.key));
for (const p of plans)
  if (
    p.minimum <= 0 ||
    p.minimum > p.questions.length ||
    new Set(p.questions).size !== p.questions.length ||
    p.questions.some((k) => !keys.has(k))
  )
    throw new Error(`Invalid plan ${p.code}`);
const assets = new Map();
const media = (text) =>
  text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, source) => {
    const url = source.startsWith("/")
      ? source
      : `/exams/prueba_general/images/${source}`;
    const local = path.join(root, "public", url);
    if (!fs.existsSync(local)) throw new Error(`Missing media ${url}`);
    const bytes = fs.readFileSync(local);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    assets.set(digest, { key: digest, path: url, size: bytes.length });
    return `![${alt || "Figura del ejercicio"}](asset:${digest})`;
  });
for (const q of questions) {
  q.prompt = media(q.prompt);
  q.help1 = media(q.help1);
  q.help2 = media(q.help2);
  q.choices = q.choices.map((c) => ({ ...c, text: media(c.text) }));
}
const version = crypto
  .createHash("sha256")
  .update(JSON.stringify({ questions, plans, rules }))
  .digest("hex")
  .slice(0, 16);
fs.mkdirSync(path.join(root, "data/catalog"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data/catalog/catalog.json"),
  JSON.stringify(
    { version, questions, plans, rules, assets: [...assets.values()] },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      version,
      questions: questions.length,
      plans: plans.map((p) => ({
        code: p.code,
        total: p.questions.length,
        minimum: p.minimum,
      })),
      rules: rules.length,
      assets: assets.size,
    },
    null,
    2,
  ),
);
