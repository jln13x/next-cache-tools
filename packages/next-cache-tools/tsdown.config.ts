import { defineConfig } from "tsdown";

export const input = [
  "src/index.ts",
  "src/devtools/index.ts",
  "src/devtools/cache-handler.ts",
];

export default defineConfig([
  {
    target: ["node18", "es2017"],
    entry: input,
    dts: {
      sourcemap: true,
      tsconfig: "./tsconfig.build.json",
    },
    unbundle: true,
    format: ["cjs", "esm"],
    outExtensions: (ctx) => ({
      dts: ctx.format === "cjs" ? ".d.cts" : ".d.mts",
      js: ctx.format === "cjs" ? ".cjs" : ".mjs",
    }),
    external: (id) => id.endsWith(".css"),
    clean: false,
  },
]);
