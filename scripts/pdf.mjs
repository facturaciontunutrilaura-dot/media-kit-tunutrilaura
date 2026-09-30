// Genera el PDF 16:9 y la imagen para compartir (og.jpg) desde dist/index.html.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(RAIZ, "dist");
const c = JSON.parse(await readFile(path.join(RAIZ, "contenido/media-kit.json"), "utf8"));
const url = "file://" + path.join(DIST, "index.html");

const browser = await chromium.launch();

// PDF: resolución x2 para que el navegador elija las fotos grandes
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(url, { waitUntil: "networkidle" });
// En el PDF se usan las versiones JPEG: se incrustan tal cual (las WebP se recomprimirían sin pérdida y el PDF pesaría varias veces más)
await page.evaluate(() => document.querySelectorAll('picture source[type="image/webp"]').forEach((s) => s.remove()));
await page.waitForLoadState("networkidle");
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
await page.pdf({
  path: path.join(DIST, c.meta.pdf),
  width: "1280px",
  height: "720px",
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  outline: true,
});
console.log(`✔ dist/${c.meta.pdf} generado`);

// Imagen para compartir el enlace (WhatsApp, email, LinkedIn): la portada
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p2 = await ctx2.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
await p2.evaluate(() => document.fonts.ready);
const buf = await p2.locator("#portada").screenshot();
await sharp(buf).resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 86 }).toFile(path.join(DIST, "og.jpg"));
console.log("✔ dist/og.jpg generado");

await browser.close();
