import re, os, json, pathlib
from textwrap import dedent

SRC_FILE = "data/preguntas_60.md"      # <- pon aquí el nombre de tu archivo original
OUT_DIR  = pathlib.Path("out")
OUT_DIR.mkdir(exist_ok=True)
(OUT_DIR / "qmd").mkdir(exist_ok=True)

# --- Utilidades ------------------------------------------------------------
def clean(s):
    # Normaliza espacios y quita trailing spaces; conserva saltos de línea
    return "\n".join([ln.rstrip() for ln in s.strip().splitlines()]).strip()

def extract_block(text, start_pat, end_pats):
    """Extrae bloque que inicia en start_pat (re) hasta el 1er end_pats (lista de res)."""
    m = re.search(start_pat, text, flags=re.IGNORECASE)
    if not m:
        return None, text
    start = m.end()
    # busca el próximo encabezado de mismo nivel
    end = len(text)
    for p in end_pats:
        m2 = re.search(p, text[start:], flags=re.IGNORECASE)
        if m2:
            end = start + m2.start()
            break
    return clean(text[start:end]), text

# --- Carga y split por pregunta -------------------------------------------
raw = pathlib.Path(SRC_FILE).read_text(encoding="utf-8")

# Divide por '# Pregunta n'
parts = re.split(r"(?m)^\s*#\s*Pregunta\s+(\d+)\s*$", raw)
# parts = ["pre", "1", "bloque1", "2", "bloque2", ...]
pairs = []
for i in range(1, len(parts), 2):
    qid = int(parts[i])
    body = parts[i+1]
    pairs.append((qid, body))

jsonl_path = OUT_DIR / "questions.jsonl"
jf = open(jsonl_path, "w", encoding="utf-8")

for qid, body in pairs:
    # Extrae secciones de nivel 2: Competencia/Evidencia/Contenido/Contexto/Respuesta correcta/Enunciado/Opciones/Ayuda 1/Ayuda 2
    def grab(h2):
        # Busca '## h2' y captura hasta el próximo '## ' o final
        pat_start = rf"(?m)^\s*##\s*{re.escape(h2)}\s*$"
        pat_end   = r"(?m)^\s*##\s*[A-ZÁÉÍÓÚÑa-z].*$"
        block, _ = extract_block(body, pat_start, [pat_end])
        return block

    d = {
        "id": qid,
        "competencia": grab("Competencia"),
        "evidencia": grab("Evidencia"),
        "contenido": grab("Contenido"),
        "contexto": grab("Contexto"),
        "respuesta_correcta": (grab("Respuesta correcta") or "").strip().splitlines()[0].strip(),
        "enunciado": grab("Enunciado"),
        "opciones": [],
        "ayudas": []
    }

    # Opciones: intenta capturar las 4 (A-D) tal como están en tu archivo
    opciones_raw = grab("Opciones de respuesta") or ""
    # patrones posibles: "A. texto" o "- A) texto" o "**A)** texto"
    # normalizamos a lista (A..D)
    opt = {"A": "", "B": "", "C": "", "D": ""}
    # Primero intenta con líneas "A. ..." (como tu formato actual)
    for m in re.finditer(r"(?m)^\s*([A-D])\s*[\.\)]\s*(.+?)\s*$", opciones_raw):
        opt[m.group(1)] = m.group(2).strip()

    # Si alguna quedó vacía, trata de capturar con bullets "- **A)** ..." o "- A) ..."
    if not all(opt.values()):
        for m in re.finditer(r"(?m)^\s*-\s*\*?\*?([A-D])\*?\*?\)\s*(.+?)\s*$", opciones_raw):
            opt[m.group(1)] = m.group(2).strip()

    # Vuelca en orden A-D:
    d["opciones"] = [ {"id": k, "texto": opt[k]} for k in ["A","B","C","D"] ]

    # Ayudas
    for k in [1,2,3,4]:
        a = grab(f"Ayuda {k}")
        if a:
            d["ayudas"].append({"titulo": f"Ayuda {k}", "texto": a})

    # Escribe JSONL
    jf.write(json.dumps(d, ensure_ascii=False) + "\n")

    # Genera QMD v1 por pregunta
    qfile = OUT_DIR / "qmd" / f"q{qid:03d}.md"
    # Construye YAML
    yaml = {
        "id": qid,
        "competencia": d["competencia"],
        "evidencia": (d["evidencia"] or "").split(".")[0].strip() if d["evidencia"] else "",
        "contenido": d["contenido"],
        "contexto": d["contexto"],
        "respuesta_correcta": d["respuesta_correcta"][:1].upper() if d["respuesta_correcta"] else "",
        "assets": []
    }
    # Body MD
    md = []
    md.append("# Enunciado")
    md.append(d["enunciado"] or "")

    md.append("\n# Opciones de respuesta")
    for o in d["opciones"]:
        # si hay marcador de imagen "[Image of ...]" lo dejamos como alt para que luego se reemplace por ruta real
        txt = o["texto"]
        mimg = re.search(r"\[Image of ([^\]]+)\]", txt, flags=re.IGNORECASE)
        if mimg:
            alt = mimg.group(1)
            # convención de archivo
            img_path = f"assets/images/q{qid:03d}_{o['id']}.png"
            yaml["assets"].append(img_path.replace("assets/",""))
            line = f"- **{o['id']})** ![{alt}]({img_path})"
        else:
            line = f"- **{o['id']})** {txt}"
        md.append(line)

    if d["ayudas"]:
        md.append("\n# Ayudas")
        for a in d["ayudas"]:
            md.append(f"## {a['titulo']}")
            md.append(a["texto"])

    # Render QMD
    qfile.write_text(
        "---\n" + json.dumps(yaml, ensure_ascii=False, indent=2)
                    .replace("{", "").replace("}", "")
                    .replace('"id"', "id")
                    .replace('"competencia"', "competencia")
                    .replace('"evidencia"', "evidencia")
                    .replace('"contenido"', "contenido")
                    .replace('"contexto"', "contexto")
                    .replace('"respuesta_correcta"', "respuesta_correcta")
                    .replace('"assets"', "assets")
                    .replace('"', "") + "\n---\n\n" +
        "\n".join(md) + "\n",
        encoding="utf-8"
    )

jf.close()
print(f"Listo. JSONL en {jsonl_path} y QMDs en {OUT_DIR/'qmd'}")
