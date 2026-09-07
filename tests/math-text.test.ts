import { expect, it } from "vitest";
import { prepareMathText } from "../src/lib/math-text";
it("keeps peso amounts literal while preserving inline and display formulas", () => {
  expect(prepareMathText("Uno de $65.000 y otro de $40.000.")).toBe(
    "Uno de \\$65.000 y otro de \\$40.000.",
  );
  expect(prepareMathText("| $250.000 | $300.000 |")).toBe(
    "| \\$250.000 | \\$300.000 |",
  );
  expect(prepareMathText("$100 + $200 + $1.000")).toBe(
    "\\$100 + \\$200 + \\$1.000",
  );
  for (const math of [
    "$80-(30+20)+10$",
    "$1~m^{2}$",
    "$x+y$",
    "$$\\frac{1}{0.00025}$$",
    "$3.500~cm^{3}$",
  ])
    expect(prepareMathText(math)).toBe(math);
});
