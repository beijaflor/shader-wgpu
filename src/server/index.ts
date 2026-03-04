import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const app = new Hono();

app.get("/health", (c) => c.text("ok"));
app.use("/assets/*", serveStatic({ root: distDir }));
app.use("/public/*", serveStatic({ root: distDir }));

app.get("/", async (c) => {
  const html = await readFile(path.join(distDir, "index.html"), "utf8");
  return c.html(html);
});

app.notFound((c) => c.text("Not found", 404));

const port = Number(process.env.PORT ?? "3000");
serve({
  fetch: app.fetch,
  port
});

console.log(`shader-wgpu server listening on http://localhost:${port}`);
