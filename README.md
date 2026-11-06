# Landing page

Landing estática con identidad de “hoja de ruta”: grafito y ámbar, tipografía
condensada para los titulares, retícula de tablero de despacho y animaciones
discretas. El nombre de la aplicación y los datos de contacto **no están escritos
en el HTML**: salen del fichero `.env` y se inyectan al construir la página.

## Puesta en marcha

```bash
cd landing-rutasapi
cp .env.example .env      # solo la primera vez
$EDITOR .env               # nombre, email, teléfono, dirección…
npm run dev               # construye y abre http://localhost:4321
```

Si el puerto 4321 está ocupado, usa otro: `PORT=8080 npm run dev`.

Para generar el sitio y subirlo:

```bash
npm run build             # escribe la carpeta dist/
```

`dist/` es una carpeta estática: súbela a Netlify, Vercel, GitHub Pages,
Cloudflare Pages o el nginx que uses. No hay dependencias que instalar: el
build es un `node build.mjs` sin ningún paquete.

## Los datos: todo vive en `.env`

`.env.example` está comentado variable a variable. Lo que más se toca:

| Variable | Dónde sale en la página |
|---|---|
| `APP_NAME` | Pestaña del navegador, menú, comparativa “con/sin”, redes, copyright |
| `COMPANY_NAME` | `© 2026 Tu Empresa S.L.` del pie |
| `EMAIL` | Botones de email (2 sitios) |
| `PHONE` / `PHONE_E164` | Teléfono del pie. El visible y el del enlace `tel:` van por separado porque uno lleva espacios y el otro no |
| `ADDRESS`, `POSTCODE`, `CITY`, `COUNTRY` | Dirección del pie |
| `LINKEDIN_URL`, `X_URL`, `GITHUB_URL` | Iconos del pie. Vacío = icono sin destino |
| `URL_DOCS`, `URL_API`, `URL_STATUS`, `URL_BLOG` | Columna “Recursos” |
| `URL_LEGAL`, `URL_PRIVACY`, `URL_COOKIES` | Barra legal del pie |
| `FORM_ACTION` | Destino del formulario de contacto |
| `FORM_MESSAGE` | Mensaje de “gracias” |
| `META_DESCRIPTION`, `OG_DESCRIPTION`, `OG_IMAGE`, `FAVICON` | Cabecera `<head>` |

Detalles que conviene saber:

- **Los valores se escapan solos.** Puedes escribir `ADDRESS=Calle de la "Mayor" 4`
  sin que rompa el HTML. Usa comillas simples si el valor empieza o acaba en
  comilla: `EMAIL='sayas@"miempresa.com'`.
- **Falta un `export`**: no hace falta. Es un `.env` normal.
- **Un enlace vacío no rompe nada**: queda como `#` y el build te avisa en consola
  de cuáles has dejado sin rellenar.
- **Si falta una variable obligatoria** (nombre, email, dirección…) el build se
  para y te dice cuál, en lugar de publicar una página con huecos.
- **`.env` está en `.gitignore`.** En un servidor, o en Netlify/Vercel, las
  mismas variables se definen en el panel del hosting; el build las lee de las
  variables de entorno del sistema si no existe `.env`.

## Las imágenes

Mete los archivos en `assets/img/` con estos nombres y listo:

| Archivo | Para qué | Si no existe |
|---|---|---|
| `hero-dashboard.png` | Captura grande del hero | Se ve un mockup vectorial animado, con las rutas dibujándose solas |
| `favicon.svg` | Icono de la pestaña | Se usa el que ya viene |

Recomendado para la captura del hero: **1600×1000 px** (proporción 16:10), en
PNG o WebP. Cualquier resolución sirve; la página la recorta y la centra sola.

Para más imágenes, donde quieras dentro del `index.html`:

```html
<img src="assets/img/mi-imagen.png" alt="Descripción de la imagen">
```

## El formulario

Con `FORM_ACTION` **vacío** el formulario no envía nada: al enviarlo solo aparece
el mensaje de `FORM_MESSAGE` (útil para enseñar el diseño sin backend).

Con `FORM_ACTION` con la URL de un servicio (Formspree, tu propia API…) ya
envía de verdad, sin tocar código.

## Los textos

El contenido de marketing está en el `index.html`, en orden de lectura. Los
bloques inventados que conviene cambiar por datos reales:

- **Las cuatro métricas** de la franja bajo el hero (distancia, tiempo, coste,
  entregas). Ya hay un aviso debajo de que son datos de ejemplo. Busca
  `data-count` en el HTML.
- **Los tres testimonios** de la sección Clientes (iniciales, nombre, cargo y
  la cita). Si no tienes clientes aún, borra esa sección entera.
- Las preguntas frecuentes, incluido el precio: como el presupuesto es por
  empresa, la respuesta dice que se prepara a medida.
- La sección “La diferencia” (planificación manual frente a la plataforma).

Si no quieres alguna sección, bórrala: borra su `<section>…</section>` y su
enlace en el menú (`.nav__links` y `.nav__menu`). El resto se ajusta solo.

## Cambiar el color y el estilo

Todo el color está al principio de `assets/css/styles.css`, en el bloque `:root`.
Lo normal es tocar solo esto:

```css
--amber: #f5a524;   /* acento único: botones, enlaces, foco */
--asphalt:#14171c;  /* grafito de las secciones oscuras y el pie */
--ink:  #15171c;    /* color del texto */
--muted:#535b68;    /* texto secundario */
--line: #e2e6ec;    /* bordes y divisores de la retícula */
--ok:   #12a150;    /* estado correcto (verde) */
--bad:  #e5484d;    /* estado con incidencia (rojo) */
```

Cambiando `--amber` se recolorean los botones, los enlaces, el foco y los acentos
de las series de datos; cambiando `--asphalt` se retiñen las secciones oscuras y
el pie.

Las fuentes (Barlow, Barlow Semi Condensed y JetBrains Mono) están autohospedadas
en `assets/fonts/` como `.woff2` con solo el subconjunto latino. Se declaran al
principio del CSS con `@font-face`. Para cambiar de tipografía, sustituye los
`.woff2` y actualiza las variables `--font-sans`, `--font-display` y `--font-mono`.

## Archivos

```
landing-rutasapi/
├── .env.example         ← plantilla de los datos (copia a .env)
├── build.mjs            ← inyecta el .env en el HTML y genera dist/
├── index.html           ← el texto y la estructura
├── package.json         ← solo los scripts, cero dependencias
└── assets/
    ├── css/styles.css   ← colores, tamaños, animaciones
    ├── js/main.js       ← animaciones al hacer scroll
    ├── fonts/           ← las .woff2 autohospedadas
    └── img/             ← tus imágenes
```

## Detalles técnicos

- **Build**: `build.mjs` sustituye los `{{VARIABLE}}` del HTML, valida que no
  falte nada y copia `assets/` a `dist/`. Sin librerías.
- **Animaciones** (todas con `IntersectionObserver` + un solo `requestAnimationFrame`,
  sin librerías, y solo `opacity`/`translate`/`scale`/`transform` para no reflowear):
  los titulares se revelan palabra a palabra desde su máscara, las secciones
  aparecen al entrar en pantalla, las listas y la barra de métricas entran
  escalonadas, el tablero del hero tiene un parallax muy leve, las barras de KPI y
  flota se llenan al mostrarse, los contadores rebotan al terminar, las escenas de
  la sección de pasos cambian con el scroll y los testimonios forman un carrusel
  con imán en móvil.
- **Sin JS se ve todo**: la clase `.js` se añade con un script en línea; si el
  script no corre, ningún bloque queda oculto a medio animar.
- **Respeta `prefers-reduced-motion`**: quien tenga las animaciones reducidas
  activadas en su sistema no ve ninguna animación.
- **Responsive**: probado a 1440 px, 1024 px y 390 px.
- **Accesibilidad**: navegación por teclado, `aria-label` en los botones de
  icono, contraste AA y respeto de `prefers-reduced-motion`.

## Si quieres tocar la estructura

- **Añadir una sección nueva**: copia el patrón de una sección clara:
  ```html
  <section class="section">
    <div class="wrap">
      <header class="head reveal">
        <h2 class="head__title">Título grande</h2>
        <p class="head__sub">Texto de apoyo.</p>
      </header>
      <!-- contenido -->
    </div>
  </section>
  ```
  La clase `reveal` hace que el bloque aparezca al hacer scroll. Si quieres que
  esa sección use una variable, escribe `{{NOMBRE_VAR}}` y añádela al `.env`; el
  build se quejará si no existe, para que no se te pase.
