import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  target: ["node20"],
  dts: true,
  clean: true,
  minify: true,
  outDir: "./dist",
  format: ["cjs", "esm", "iife"],
});
