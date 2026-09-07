export function prepareMathText(text: string) {
  const formulas: string[] = [];
  const protectedText = text.replace(
    /\$\$[\s\S]*?\$\$|(?<![\\$])\$([^$\n]+)\$(?!\$)/g,
    (match, inner: string | undefined) => {
      if (inner !== undefined) {
        const numeric = /^[\d\s.,()+*/−-]+$/.test(inner);
        const algebra =
          /^[a-zA-Z\d\s.,()+*/−-]+$/.test(inner) &&
          /[+*/−-]/.test(inner) &&
          !/\b[a-zA-Z]{2,}\b/.test(inner);
        const complete = !/[+*/−-]\s*$/.test(inner);
        const formula =
          /[\\=^_{}~]/.test(inner) ||
          /^[a-zA-Z]$/.test(inner) ||
          ((numeric || algebra) && complete);
        if (!formula) return match;
      }
      const index = formulas.push(match) - 1;
      return `\uE000${index}\uE001`;
    },
  );
  return protectedText
    .replace(/(?<!\\)\$(?=\s*\d)/g, "\\$")
    .replace(/\uE000(\d+)\uE001/g, (_, index) => formulas[Number(index)]);
}
