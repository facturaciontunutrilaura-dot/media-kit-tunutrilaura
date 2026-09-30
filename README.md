# Media Kit 2026 · Tunutrilaura

Media Kit editorial de Laura Barbero para podcasts, entrevistas, medios, charlas y colaboraciones.
Una sola fuente de contenido genera **la web responsive** y **el PDF horizontal 16:9**.

```
contenido/media-kit.json   ← TODO el texto (único sitio donde se edita)
src/fotos.json             ← qué foto va en cada página y su encuadre
src/estilos.css            ← diseño: móvil, tablet, escritorio y PDF
fotos/  marca/  src/fonts/ ← retratos, logo, galleta y tipografías de la marca
dist/                      ← RESULTADO listo para publicar (web + PDF)
auditoria/                 ← auditoría y propuesta de dirección de arte
original/                  ← PPTX original de referencia
```

## Cambiar un texto

1. Edita `contenido/media-kit.json`. Escribe `*palabra*` para la cursiva rosa de acento y `**palabra**` para la negrita.
2. Regenera la web y el PDF:

```bash
npm install          # solo la primera vez
npx playwright install chromium   # solo la primera vez, fuera de este entorno
npm run all          # web + PDF + control de calidad
```

`npm run all` hace tres cosas:
- genera `dist/index.html`;
- genera `dist/MediaKit-Tunutrilaura-2026.pdf` y `dist/og.jpg` (la imagen que se ve al compartir el enlace);
- **comprueba** que el PDF tenga 10 páginas, que ningún texto se salga de su página ni pise el folio, que no haya scroll horizontal en móvil y que ninguna foto esté deformada. Las capturas de revisión quedan en `qa/`.

Si un texto nuevo es más largo y no cabe en su página del PDF, el control de calidad lo avisa.

## Publicar en tunutrilaura.com/media-kit

La carpeta `dist/` es una web estática sin dependencias, con todas las rutas relativas. Funciona en cualquier subcarpeta.

1. En el hosting de tunutrilaura.com, crea la carpeta `media-kit/` en la raíz pública (normalmente `public_html/`).
2. Sube **el contenido** de `dist/` (no la carpeta en sí) por FTP o desde el gestor de archivos del hosting.
3. Abre `https://tunutrilaura.com/media-kit/`.

Con WordPress, la carpeta física `media-kit/` normalmente tiene prioridad sobre las páginas de WordPress, así que no hay que tocar el tema.
La dirección definitiva está configurada en `meta.url` del contenido y se usa para la vista previa al compartir. Si cambia, actualízala y regenera.

**Ya configurado:**
- `noindex`: la página no aparecerá en Google, porque no es una web para pacientes.
- Vista previa cuidada al compartir por WhatsApp, email o LinkedIn.
- Enlace "Descargar PDF" en la cabecera y en Contacto.

## Formatos

| | Web | PDF |
|---|---|---|
| Móvil (320–430 px) | Revista vertical: cada página con su composición adaptada, texto de 17 px, contacto con áreas táctiles de 48 px | — |
| Tablet (720–1179 px) | Composiciones a dos columnas | — |
| Escritorio (≥1180 px) | Las 10 páginas 16:9 como doble página de revista | — |
| PDF | — | 16:9 (1280 × 720 px), 10 páginas, fuentes incrustadas, enlaces clicables e índice interno |

## Marca

- Nombre en el texto: **Tunutrilaura**. El logo no se modifica.
- Paleta y tipografías del sistema de diseño "tunutri laura" (Cormorant Garamond + Manrope). Las fuentes están bajo licencia SIL Open Font License y se alojan en el propio proyecto.
- Fotos: solo retratos de Laura. No se usa ninguna imagen de banco de imágenes.
