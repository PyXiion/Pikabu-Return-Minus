// Bundles src/ into a single userscript file: dist/index.js
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const header = readFileSync("src/header.txt", "utf8").trimEnd();

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "iife",
  target: "es2020",
  charset: "utf8",
  banner: { js: header },
});
