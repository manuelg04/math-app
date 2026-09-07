import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const catalog = JSON.parse(
  fs.readFileSync("data/catalog/catalog.json", "utf8"),
);
const flags = process.argv.includes("--prod") ? ["--prod"] : [];
const run = (name, args) =>
  JSON.parse(
    execFileSync(
      "npx",
      ["convex", "run", name, JSON.stringify(args), ...flags],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    ).trim() || "null",
  );
for (const asset of catalog.assets) {
  if (run("seed:getAsset", { key: asset.key })) continue;
  const url = run("seed:uploadUrl", {});
  const ext = path.extname(asset.path).toLowerCase();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg",
    },
    body: fs.readFileSync(path.join("public", asset.path)),
  });
  if (!response.ok) throw new Error(`Asset upload failed: ${response.status}`);
  const { storageId } = await response.json();
  run("seed:asset", { key: asset.key, storageId });
  console.log(
    `Imported media ${catalog.assets.indexOf(asset) + 1}/${catalog.assets.length}`,
  );
}
for (let i = 0; i < catalog.questions.length; i += 15) {
  run("seed:questions", {
    version: catalog.version,
    questions: catalog.questions.slice(i, i + 15),
  });
  console.log(
    `Imported questions ${Math.min(i + 15, catalog.questions.length)}/${catalog.questions.length}`,
  );
}
run("seed:configure", {
  version: catalog.version,
  plans: catalog.plans,
  rules: catalog.rules,
});
const counts = run("seed:verify", { version: catalog.version });
if (
  counts.questions !== 185 ||
  counts.plans !== 7 ||
  counts.rules !== 27 ||
  counts.assets < catalog.assets.length
)
  throw new Error("Catalog verification failed");
console.log(JSON.stringify({ version: catalog.version, ...counts }));
