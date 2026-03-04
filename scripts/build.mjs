import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const distAssetsDir = path.join(distDir, "assets");
const distServerDir = path.join(rootDir, "dist-server");

await rm(distDir, { recursive: true, force: true });
await rm(distServerDir, { recursive: true, force: true });
await mkdir(distAssetsDir, { recursive: true });

await esbuild.build({
  entryPoints: {
    app: path.join(rootDir, "src/client/main.ts")
  },
  outdir: distAssetsDir,
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  logLevel: "info"
});

await esbuild.build({
  entryPoints: [path.join(rootDir, "src/server/index.ts")],
  outfile: path.join(distServerDir, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
  external: []
});

const htmlTemplate = await readFile(path.join(rootDir, "src/client/index.html"), "utf8");
const html = htmlTemplate
  .replace("__APP_CSS__", "/assets/app.css")
  .replace("__APP_JS__", "/assets/app.js");

await writeFile(path.join(distDir, "index.html"), html, "utf8");

const publicDir = path.join(rootDir, "public");
await cp(publicDir, path.join(distDir, "public"), { recursive: true });
