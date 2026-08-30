// One build, one source of truth for the API origin.
//
// API_BASE is injected as an esbuild `define`, so no module can hardcode the
// domain: src/config.ts reads the injected `__API_BASE__` and nothing else in
// the extension knows the URL. The manifest and popup.html are JSON/HTML and
// cannot import a constant, so their `__API_ORIGIN__` placeholders get the same
// value substituted here.
//
//   pnpm build                              -> production domain (default below)
//   ELIGENT_API_BASE=<origin> pnpm dev      -> that origin instead
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

export const API_BASE = (process.env.ELIGENT_API_BASE ?? "https://eligent.karanrajkr.com").replace(/\/+$/, "");

const ENTRY_POINTS = ["src/background.ts", "src/bridge.ts", "src/popup.ts", "src/content.ts"];

/** Shared by the bundles and by the test builds, so tests see the same origin. */
export const defines = { __API_BASE__: JSON.stringify(API_BASE) };

const STATIC = [
  "popup.css",
  "demo-docdiff.json",
  "demo-filled.json",
  "demo-blocked.json",
];

/** Files that carry the origin as a literal and get it substituted in. */
const TEMPLATED = ["manifest.json", "popup.html"];

export async function build({ watch = false } = {}) {
  mkdirSync("dist", { recursive: true });

  const options = {
    entryPoints: ENTRY_POINTS,
    bundle: true,
    outdir: "dist",
    format: "esm",
    target: "chrome100",
    define: defines,
  };

  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }

  for (const file of STATIC) copyFileSync(`public/${file}`, `dist/${file}`);
  for (const file of TEMPLATED) {
    const source = readFileSync(`public/${file}`, "utf8");
    if (!source.includes("__API_ORIGIN__")) {
      throw new Error(`public/${file} has no __API_ORIGIN__ placeholder — did someone hardcode a domain?`);
    }
    writeFileSync(`dist/${file}`, source.replaceAll("__API_ORIGIN__", API_BASE));
  }

  return API_BASE;
}

// `node build.mjs [--watch]` — importing this file (the test builds do) runs nothing.
if (import.meta.url === `file://${process.argv[1]}`) {
  const watch = process.argv.includes("--watch");
  await build({ watch });
  console.log(`extension built against ${API_BASE}${watch ? " (watching)" : ""}`);
}
