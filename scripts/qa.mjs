// Control de calidad: desbordes en el PDF, scroll horizontal en móvil,
// fotos deformadas, número de páginas y capturas para revisión visual.
import { chromium } from "playwright";
import { readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(RAIZ, "dist");
const QA = path.join(RAIZ, "qa");
const c = JSON.parse(await readFile(path.join(RAIZ, "contenido/media-kit.json"), "utf8"));
const url = "file://" + path.join(DIST, "index.html");
const fallos = [];
await rm(QA, { recursive: true, force: true });
await mkdir(QA, { recursive: true });

const browser = await chromium.launch();

// 1 · PDF: páginas exactas
const pdf = await readFile(path.join(DIST, c.meta.pdf), "latin1");
const paginas = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
if (paginas !== 10) fallos.push(`PDF: ${paginas} páginas (se esperaban 10)`);

// 2 · Maqueta de impresión: nada se sale de su página
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  await p.emulateMedia({ media: "print" });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll(".pg").forEach((pg) => {
      const b = pg.getBoundingClientRect();
      if (Math.round(b.width) !== 1280 || Math.round(b.height) !== 720) out.push(`${pg.id}: tamaño ${b.width}×${b.height}`);
      const folio = pg.querySelector(".folio")?.getBoundingClientRect();
      pg.querySelectorAll(".pg-in *:not(.marca-agua):not(.sello):not(source)").forEach((el) => {
        const e = el.getBoundingClientRect();
        if (!e.width || !e.height || el.closest(".foto")) return;
        const margen = 0.5;
        if (e.bottom > b.bottom + margen || e.right > b.right + margen || e.left < b.left - margen || e.top < b.top - margen)
          out.push(`${pg.id}: <${el.tagName.toLowerCase()} class="${el.className}"> se sale de la página`);
        // el contenido no puede pisar el folio
        if (folio && !el.closest(".dicho") && el.children.length === 0 && e.bottom > folio.top - 4 && e.top < folio.bottom && e.right > folio.left && e.left < folio.right)
          out.push(`${pg.id}: <${el.tagName.toLowerCase()} class="${el.className}"> pisa el folio`);
      });
    });
    return out;
  });
  fallos.push(...r);
  for (const id of await p.$$eval(".pg", (a) => a.map((x) => x.id))) {
    await p.locator("#" + id).screenshot({ path: path.join(QA, `pdf-${id}.png`) });
  }
  await ctx.close();
}

// 3 · Responsive: sin scroll horizontal y fotos sin deformar
for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, deviceScaleFactor: w < 800 ? 2 : 1 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth) out.push(`scroll horizontal (${document.documentElement.scrollWidth}px)`);
    document.querySelectorAll(".foto img").forEach((i) => {
      if (getComputedStyle(i).objectFit !== "cover") out.push(`foto sin recorte: ${i.alt}`);
    });
    document.querySelectorAll("p, li, dd, h1, h2, h3, a").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`texto cortado: ${el.textContent.slice(0, 40)}`);
    });
    return out;
  });
  fallos.push(...r.map((x) => `${w}px: ${x}`));
  // recorrer la página para que el navegador pinte todas las fotos antes de capturar
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await p.screenshot({ path: path.join(QA, `web-${w}.png`), fullPage: true });
  await ctx.close();
}

await browser.close();
if (fallos.length) {
  console.log("✘ QA con incidencias:\n  " + fallos.join("\n  "));
  process.exitCode = 1;
} else console.log(`✔ QA correcto: PDF de ${paginas} páginas, sin desbordes; capturas en qa/`);
