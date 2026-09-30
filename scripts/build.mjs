// Genera dist/ (la web) a partir de contenido/media-kit.json.
// El PDF se genera después desde esta misma página (scripts/pdf.mjs).
import { readFile, writeFile, mkdir, cp, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(RAIZ, "dist");
const c = JSON.parse(await readFile(path.join(RAIZ, "contenido/media-kit.json"), "utf8"));
const fotos = JSON.parse(await readFile(path.join(RAIZ, "src/fotos.json"), "utf8"));

// ---------- imágenes ----------
const ANCHOS = [480, 800, 1200, 1800, 2400];

async function derivadas(nombre) {
  const origen = path.join(RAIZ, "fotos", `${nombre}.jpg`);
  const meta = await sharp(origen).metadata();
  const anchos = ANCHOS.filter((w) => w < meta.width).concat(meta.width);
  const salida = [];
  for (const w of [...new Set(anchos)]) {
    for (const fmt of ["webp", "jpg"]) {
      const f = path.join(DIST, "img", `${nombre}-${w}.${fmt}`);
      if (!existsSync(f) || (await stat(f)).mtimeMs < (await stat(origen)).mtimeMs) {
        const img = sharp(origen).resize({ width: w, withoutEnlargement: true });
        await (fmt === "webp" ? img.webp({ quality: 80 }) : img.jpeg({ quality: 82, mozjpeg: true })).toFile(f);
      }
    }
    salida.push(w);
  }
  return { anchos: salida, ratio: meta.width / meta.height };
}

// ---------- utilidades ----------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// *cursiva de acento* y **negrita**
const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
const plano = (s) => String(s).replace(/\*/g, "");

let imgs = {};
function foto(clave, sizes, clase = "") {
  const f = fotos[clave];
  const d = imgs[clave];
  const set = (fmt) => d.anchos.map((w) => `img/${f.archivo}-${w}.${fmt} ${w}w`).join(", ");
  const mayor = d.anchos.at(-1);
  return `<picture class="foto ${clase}">
      <source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">
      <img src="img/${f.archivo}-${mayor}.jpg" srcset="${set("jpg")}" sizes="${sizes}" alt="${esc(f.alt)}" style="--pos:${f.pos}${f.posMovil ? `;--pos-movil:${f.posMovil}` : ""}${f.zoom ? `;--zoom:${f.zoom};--origen:${f.pos}` : ""}" decoding="async">
    </picture>`;
}

const PAGINAS = [
  ["portada", "Portada"],
  ["vistazo", plano(c.vistazo.titulo)],
  ["sobre-mi", plano(c.sobreMi.titulo)],
  ["que-es", plano(c.queEs.titulo)],
  ["temas", plano(c.temas.titulo)],
  ["preguntas", plano(c.preguntas.titulo)],
  ["mitos", plano(c.mitos.titulo)],
  ["mirada", plano(c.mirada.titulo)],
  ["participar", `${plano(c.participar.titulo)} · ${plano(c.testimonios.titulo)}`],
  ["contacto", c.contacto.etiqueta],
];
const n2 = (i) => String(i).padStart(2, "0");
const folio = (i, extra = "") => `
    <footer class="folio ${extra}">
      <span>${esc(c.meta.folio)}</span>
      <span class="folio-n"><img src="img/galleta-64.png" alt="" width="16" height="16">${n2(i)}</span>
    </footer>`;

// ---------- páginas ----------
// Numeración: la portada no lleva número; De un vistazo = 01 … Contacto = 09
const arco = (clave, sizes, clase = "") => `<div class="arco ${clase}"><span class="arco-fondo" aria-hidden="true"></span><div class="arco-foto">${foto(clave, sizes)}</div></div>`;

function portada() {
  const p = c.portada;
  // El nombre se dibuja dos veces con recorte: sobre la página en su color de marca
  // y, donde cruza la foto, en cacao, para que el cruce sea legible y deliberado.
  const nombre = (capa) => `<p class="portada-nombre ${capa}"${capa === "capa-foto" ? ' aria-hidden="true"' : ""}><span>${esc(p.nombre)}</span> <em>${esc(p.apellido)}</em></p>`;
  return `
  <section class="pg pg-portada" id="portada" aria-label="Portada">
    <div class="pg-in">
      <div class="portada-cab">
        <img class="portada-logo" src="img/logo-tunutrilaura.png" alt="Tunutrilaura" width="600" height="600">
        <p class="etq">${esc(p.etiqueta)}</p>
      </div>
      <div class="portada-foto">${foto("portada", "(min-width: 1180px) 60vw, 100vw")}</div>
      <h1 class="portada-titulo">${nombre("capa-pagina")}${nombre("capa-foto")}</h1>
      <img class="sello" src="img/galleta-256.png" alt="" width="128" height="128">
      <div class="portada-texto">
        <p class="portada-prof">${esc(p.profesion)}</p>
        <ul class="portada-esp">${p.especialidades.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      </div>
      <p class="portada-pie">${p.pie.map(esc).join('<span aria-hidden="true"> · </span>')}</p>
    </div>
  </section>`;
}

function vistazo() {
  const v = c.vistazo;
  const [quien, dedico, espec, temas, formatos, contacto] = v.filas;
  const lista = (f, marca) => `
          <div class="vistazo-lista">
            <p class="etq">${esc(f.etiqueta)}</p>
            <ul>${f.texto
              .split(" · ")
              .map((x, i) => `<li><span aria-hidden="true">${marca === "n" ? n2(i + 1) : "—"}</span><a href="${f.enlace}">${esc(x)}</a></li>`)
              .join("")}</ul>
          </div>`;
  return `
  <section class="pg pg-vistazo" id="vistazo">
    <div class="pg-in">
      <aside class="vistazo-lado">
        ${arco("vistazo", "(min-width: 1180px) 24vw, 70vw")}
        <div class="vistazo-quien">
          <p class="etq">${esc(quien.etiqueta)}</p>
          <p class="quien-texto">${md(quien.texto)}</p>
          <p class="etq">${esc(contacto.etiqueta)}</p>
          <p class="quien-contacto"><a href="${contacto.enlace}">${md(contacto.texto)}</a></p>
        </div>
      </aside>
      <div class="vistazo-texto">
        <h2 class="h">${md(v.titulo)}</h2>
        <p class="etq vistazo-etq">${esc(espec.etiqueta)}</p>
        <p class="idea">${md(espec.texto)}</p>
        <p class="etq vistazo-etq">${esc(dedico.etiqueta)}</p>
        <p class="cuerpo">${md(dedico.texto)}</p>
        <div class="vistazo-listas">${lista(temas, "n")}${lista(formatos, "r")}
        </div>
        <div class="bio" id="bio">
          <div class="bio-cab">
            <p class="etq">${esc(v.bio.etiqueta)}</p>
            <p class="bio-nota">${esc(v.bio.nota)}</p>
            <button type="button" class="bio-copiar no-print" data-ok="${esc(v.bio.copiado)}">${esc(v.bio.boton)}</button>
            <span class="bio-estado" role="status" aria-live="polite"></span>
          </div>
          <p class="bio-texto" id="bio-texto">${md(v.bio.texto)}</p>
        </div>
      </div>
      <nav class="indice" aria-label="${esc(v.indice)}">
        <p class="etq">${esc(v.indice)}</p>
        <ol>${PAGINAS.slice(2)
          .map(([id, t], i) => `<li><a href="#${id}"><span>${n2(i + 2)}</span>${esc(t)}</a></li>`)
          .join("")}</ol>
      </nav>
    </div>${folio(1, "folio-vistazo")}
  </section>`;
}

function sobreMi() {
  const s = c.sobreMi;
  return `
  <section class="pg pg-sobre fondo-crema" id="sobre-mi">
    <div class="pg-in">
      <div class="sobre-foto">${foto("sobreMi", "(min-width: 1180px) 40vw, (min-width: 900px) 42vw, 100vw")}</div>
      <div class="sobre-texto">
        <h2 class="h">${md(s.titulo)}</h2>
        <p class="cita">${md(s.cita)}</p>
        ${s.parrafos.map((p) => `<p class="cuerpo">${md(p)}</p>`).join("\n        ")}
        <ul class="datos">${s.datos
          .map((d) => `<li><span class="cifra">${esc(d.cifra)}</span><span class="dato-texto">${esc(d.texto)}</span></li>`)
          .join("")}</ul>
        <p class="sobre-pie">${esc(s.pie)}</p>
      </div>
    </div>${folio(2, "folio-der")}
  </section>`;
}

const ROMANOS = ["I", "II", "III", "IV"];
function queEs() {
  const q = c.queEs;
  const lista = (b, clase) => `
        <div class="posicion ${clase}">
          <h3>${esc(b.titulo)}</h3>
          <ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        </div>`;
  return `
  <section class="pg pg-quees" id="que-es">
    <div class="pg-in">
      <header class="quees-cab">
        <h2 class="h">${md(q.titulo)}</h2>
        <p class="idea">${md(q.entradilla)}</p>
      </header>
      <ol class="pilares">${q.pilares
        .map((p, i) => `
        <li><span class="romano" aria-hidden="true">${ROMANOS[i]}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`)
        .join("")}
      </ol>
      <div class="posiciones">${lista(q.si, "si")}${lista(q.no, "no")}
      </div>
    </div>${folio(3)}
  </section>`;
}

function temas() {
  const t = c.temas;
  return `
  <section class="pg pg-temas" id="temas">
    <div class="pg-in">
      <header class="temas-cab">
        <h2 class="h">${md(t.titulo)}</h2>
        <p class="idea">${md(t.entradilla)}</p>
        <img class="temas-galleta" src="img/galleta-512.png" alt="" width="512" height="512">
      </header>
      <ol class="carta">${t.bloques
        .map((b, i) => `
        <li><span class="carta-n" aria-hidden="true">${n2(i + 1)}</span><div><h3>${esc(b.titulo)}</h3><ul>${b.temas
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ul></div></li>`)
        .join("")}
      </ol>
    </div>${folio(4, "folio-der")}
  </section>`;
}

function preguntas() {
  const p = c.preguntas;
  return `
  <section class="pg pg-preguntas fondo-crema" id="preguntas">
    <div class="pg-in">
      <div class="preguntas-texto">
        <h2 class="h">${md(p.titulo)}</h2>
        <p class="pregunta-destacada">${md(p.destacada)}</p>
        <ul class="preguntas">${p.otras.map((q) => `<li>${md(q)}</li>`).join("")}</ul>
        <p class="nota">${md(p.nota)}</p>
      </div>
      ${arco("preguntas", "(min-width: 1180px) 40vw, 90vw", "preguntas-arco")}
    </div>${folio(5, "folio-izq")}
  </section>`;
}

const FLECHA = `<svg class="flecha" viewBox="0 0 16 28" aria-hidden="true"><path d="M8 1v25M1.5 19.5 8 26l6.5-6.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function mitos() {
  const m = c.mitos;
  return `
  <section class="pg pg-mitos" id="mitos">
    <div class="pg-in">
      <div class="mitos-cab">
        <h2 class="h">${md(m.titulo)}</h2>
        <div class="mitos-arco" aria-hidden="true"><img src="img/galleta-256.png" alt="" width="256" height="256"></div>
      </div>
      <ol class="mitos">${m.lista
        .map((x) => `
        <li>
          <p class="etq">${esc(m.etiquetaMito)}</p>
          <p class="mito">“${esc(x.mito)}”</p>
          ${FLECHA}
          <p class="etq etq-fuerte">${esc(m.etiquetaRealidad)}</p>
          <p class="realidad">${esc(x.realidad)}</p>
        </li>`)
        .join("")}
      </ol>
    </div>${folio(6)}
  </section>`;
}

function mirada() {
  const m = c.mirada;
  return `
  <section class="pg pg-mirada" id="mirada">
    <div class="pg-in">
      <div class="mirada-foto">${foto("mirada", "100vw")}</div>
      <div class="mirada-cuerpo">
        <h2 class="h">${md(m.titulo)}</h2>
        <ul class="principios">${m.principios
          .map((p) => `<li><p class="etq">${esc(p.etiqueta)}</p><p class="principio">${md(p.texto)}</p></li>`)
          .join("")}</ul>
        <div class="formacion">
          <p class="etq">${esc(m.formacionTitulo)}</p>
          <ul>${m.formacion
            .map((f) => `<li><span class="sigla">${esc(f.sigla)}</span><span>${esc(f.texto)}</span></li>`)
            .join("")}</ul>
          <p class="formacion-extra">${md(m.formacionExtra)}</p>
        </div>
      </div>
    </div>${folio(7)}
  </section>`;
}

function participar() {
  const p = c.participar;
  const t = c.testimonios;
  return `
  <section class="pg pg-participar" id="participar">
    <div class="pg-in">
      <div class="participar-cab">
        <h2 class="h">${md(p.titulo)}</h2>
        <p class="nota">${md(p.nota)}</p>
      </div>
      <ul class="formatos">${p.formatos
        .map((f) => `<li><h3>${esc(f.titulo)}</h3><p>${esc(f.texto)}</p></li>`)
        .join("")}</ul>
      <div class="dicho" id="han-dicho">
        <div class="dicho-cab">
          <h2 class="h-sec">${md(t.titulo)}</h2>
          <p class="nota">${md(t.nota)}</p>
        </div>
        ${t.lista
          .map((x) => `<figure class="testimonio"><blockquote><p>${esc(x.texto)}</p></blockquote><figcaption>${esc(x.firma)}</figcaption></figure>`)
          .join("\n        ")}
      </div>
    </div>${folio(8)}
  </section>`;
}

function contacto() {
  const k = c.contacto;
  return `
  <section class="pg pg-contacto fondo-palo" id="contacto">
    <div class="pg-in">
      ${arco("contacto", "(min-width: 1180px) 60vw, 130vw", "contacto-arco")}
      <div class="contacto-texto">
        <p class="etq">${esc(k.etiqueta)}</p>
        <h2 class="contacto-titulo">${md(k.titulo)}</h2>
        <p class="contacto-sub">${md(k.subtitulo)}</p>
        <ul class="canales">${k.canales
          .map((x) => `<li><span class="etq">${esc(x.etiqueta)}</span><a href="${esc(x.href)}"${x.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(x.texto)}</a></li>`)
          .join("")}</ul>
        <div class="contacto-cierre">
          <span class="contacto-logo"><img src="img/logo-tunutrilaura.png" alt="Tunutrilaura" width="600" height="600"></span>
          <p>${k.firma.map(esc).join("<br>")}</p>
          <a class="descargar no-print" href="${esc(c.meta.pdf)}" download>${esc(k.descargar)}</a>
        </div>
      </div>
    </div>${folio(9, "folio-izq")}
  </section>`;
}

// ---------- ensamblado ----------
await mkdir(path.join(DIST, "img"), { recursive: true });
for (const k of Object.keys(fotos).filter((k) => !k.startsWith("_"))) imgs[k] = await derivadas(fotos[k].archivo);

const logo = path.join(RAIZ, "marca/logo-tunutrilaura.png");
const galleta = path.join(RAIZ, "marca/galleta.png");
await sharp(logo).resize(600).png().toFile(path.join(DIST, "img/logo-tunutrilaura.png"));
for (const w of [64, 256, 512]) await sharp(galleta).resize(w).png().toFile(path.join(DIST, `img/galleta-${w}.png`));
await sharp(galleta).resize(180).png().toFile(path.join(DIST, "apple-touch-icon.png"));
await rm(path.join(DIST, "fonts"), { recursive: true, force: true });
await cp(path.join(RAIZ, "src/fonts"), path.join(DIST, "fonts"), { recursive: true });
await cp(path.join(RAIZ, "src/estilos.css"), path.join(DIST, "estilos.css"));

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(c.meta.titulo)}</title>
<meta name="description" content="${esc(c.meta.descripcion)}">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f7f1eb">
<link rel="canonical" href="${esc(c.meta.url)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(c.meta.titulo)}">
<meta property="og:description" content="${esc(c.meta.descripcion)}">
<meta property="og:url" content="${esc(c.meta.url)}">
<meta property="og:image" content="${esc(c.meta.url)}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="img/galleta-64.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="fonts/CormorantGaramond-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/Manrope-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="estilos.css">
</head>
<body>
<a class="saltar" href="#vistazo">Ir al contenido</a>
<header class="barra no-print">
  <a class="barra-marca" href="#portada">Tunutrilaura <span>· ${esc(c.portada.etiqueta)}</span></a>
  <nav aria-label="Accesos rápidos">
    <a href="#contacto">${esc(c.contacto.etiqueta)}</a>
    <a href="${esc(c.meta.pdf)}" download>PDF</a>
  </nav>
</header>
<main>
${[portada, vistazo, sobreMi, queEs, temas, preguntas, mitos, mirada, participar, contacto].map((f) => f()).join("\n")}
</main>
<script>
document.querySelector(".bio-copiar")?.addEventListener("click", async (e) => {
  const b = e.currentTarget, st = document.querySelector(".bio-estado");
  const t = document.getElementById("bio-texto").innerText.trim();
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (_) {}
  if (!ok) { const r = document.createRange(); r.selectNodeContents(document.getElementById("bio-texto")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); try { ok = document.execCommand("copy"); } catch (_) {} }
  st.textContent = ok ? b.dataset.ok : "";
  if (ok) setTimeout(() => (st.textContent = ""), 2500);
});
</script>
</body>
</html>
`;
await writeFile(path.join(DIST, "index.html"), html);
console.log("✔ dist/index.html generado");
