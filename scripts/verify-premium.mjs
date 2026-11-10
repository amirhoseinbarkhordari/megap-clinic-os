import { readFile } from "node:fs/promises";

const design = await readFile(new URL("../DESIGN.md", import.meta.url), "utf8");
const css = await readFile(new URL("../apps/web/src/app/globals.css", import.meta.url), "utf8");
const requiredTokens = [
  "#145C50",
  "#C7A66A",
  "#F6F7F5",
  "#FFFFFF",
  "#202724",
  "#78817C",
  "#E5EAE6",
];
const extractTokens = (source) =>
  new Set([...source.matchAll(/#[0-9a-f]{6}/gi)].map(([token]) => token.toLowerCase()));
const designTokens = extractTokens(design);
const runtimeTokens = extractTokens(css);
const missingTokens = requiredTokens.filter(
  (token) => !designTokens.has(token.toLowerCase()) || !runtimeTokens.has(token.toLowerCase()),
);

if (missingTokens.length > 0) {
  console.error(`Design token drift: ${missingTokens.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Design tokens match DESIGN.md and the web runtime stylesheet.");
}
