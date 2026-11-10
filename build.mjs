/* =====================================================================
   build.mjs — genera la landing substituting las variables de .env
   ---------------------------------------------------------------------
     node build.mjs            → construye en dist/
     node build.mjs --serve    → construye y además sirve dist/ en :4321
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DIST = join(RAIZ, 'dist');
const PUERTO = Number(process.env.PORT) || 4321;

/* ---------------------------------------------------------------- */
/* Valores por defecto de las variables opcionales                   */
/* ---------------------------------------------------------------- */
const POR_DEFECTO = {
  META_DESCRIPTION: 'Rutas de reparto y recogida optimizadas sobre carretera real, app de conductor con incidencias, agenda de flota, comparativa de ahorro y módulo de almacén. Se instala en tu servidor.',
  OG_DESCRIPTION: 'Optimización de rutas, gestión de flota y almacén para equipos de logística.',
  OG_IMAGE: 'assets/img/og-image.png',
  FAVICON: 'assets/img/favicon.svg',
  FORM_ACTION: '',
  FORM_MESSAGE: '¡Gracias! Te escribimos en breve.',
  LINKEDIN_URL: '',
  X_URL: '',
  GITHUB_URL: '',
  URL_DOCS: '',
  URL_API: '',
  URL_STATUS: '',
  URL_BLOG: '',
  URL_LEGAL: '',
  URL_PRIVACY: '',
  URL_COOKIES: '',
};

/* Las que, si faltan, son un error: la página quedaría con huecos. */
const OBLIGATORIAS = [
  'APP_NAME', 'COMPANY_NAME', 'EMAIL', 'PHONE', 'PHONE_E164',
  'ADDRESS', 'POSTCODE', 'CITY', 'COUNTRY',
];

/* ---------------------------------------------------------------- */
/* Lectura de .env                                                   */
/* ---------------------------------------------------------------- */
function leerEnv(ruta) {
  const vars = {};
  const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/);

  lineas.forEach((linea, i) => {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) return;

    const igual = limpia.indexOf('=');
    if (igual < 1) {
      throw new Error(`${ruta}:${i + 1} — línea sin «=»: ${limpia}`);
    }

    const clave = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();

    if ((valor.startsWith('"') && valor.endsWith('"') && valor.length > 1) ||
        (valor.startsWith("'") && valor.endsWith("'") && valor.length > 1)) {
      valor = valor.slice(1, -1);
    }
    vars[clave] = valor;
  });

  return vars;
}

/* ---------------------------------------------------------------- */
/* Sustitución de los {{VARIABLE}}                                   */
/* ---------------------------------------------------------------- */
/* Los valores se escapan para que sirvan igual en texto y en atributos:
   ADDRESS='Calle de la "Mayor" 4' no rompe el HTML, se renderiza bien. */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapar = (valor) => valor.replace(/[&<>"]/g, (c) => ESCAPES[c]);

function sustituir(plantilla, vars) {
  const desconocidas = new Set();

  const salida = plantilla.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, clave) => {
    if (!(clave in vars)) desconocidas.add(clave);
    return clave in vars ? escapar(vars[clave]) : match;
  });

  return { salida, desconocidas };
}

/* ---------------------------------------------------------------- */
/* Build                                                             */
/* ---------------------------------------------------------------- */
function construir() {
  const rutaEnv = join(RAIZ, '.env');

  if (!existsSync(rutaEnv)) {
    const ejemplo = join(RAIZ, '.env.example');
    if (existsSync(ejemplo)) {
      copyFileSync(ejemplo, rutaEnv);
      console.log('\n  No había .env: he creado una copia de .env.example.');
      console.log('  Edítalo con tus datos y vuelve a ejecutar el build.\n');
    }
  }

  const vars = { ...POR_DEFECTO, YEAR: String(new Date().getFullYear()) };

  if (existsSync(rutaEnv)) Object.assign(vars, leerEnv(rutaEnv));

  for (const [clave, valor] of Object.entries(process.env)) {
    if (typeof valor === 'string' && valor.trim()) vars[clave] = valor;
  }

  const faltan = OBLIGATORIAS.filter((clave) => !vars[clave]?.trim());
  if (faltan.length) {
    console.error('\n  Faltan estas variables en .env: ' + faltan.join(', '));
    console.error('  Copia .env.example a .env y rellénalas.\n');
    process.exit(1);
  }

  const { salida: conDatos, desconocidas } = sustituir(readFileSync(join(RAIZ, 'index.html'), 'utf8'), vars);

  if (desconocidas.size) {
    console.error('\n  Estas variables no están en el .env ni tienen valor por defecto: ' +
                  [...desconocidas].join(', '));
    console.error('  Añádelas al .env para que no queden {{así}} en la página.\n');
    process.exit(1);
  }

  // Un enlace sin destino no debe romper la página: se queda inactivo (#).
  const salida = conDatos.replace(/href=""/g, 'href="#"');
  const vacios = Object.entries(vars)
    .filter(([clave, valor]) => valor === '' && (clave.startsWith('URL_') || clave.endsWith('_URL')))
    .map(([clave]) => clave);

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  writeFileSync(join(DIST, 'index.html'), salida);
  copiarAssets();

  console.log(`  ${vars.APP_NAME} → dist/  (${vars.EMAIL} · ${vars.CITY})`);
  if (vacios.length) {
    console.log(`  Enlaces sin destino (ponles valor en el .env): ${vacios.join(', ')}`);
  }
}

function copiarAssets(padre = 'assets', destino = 'assets') {
  const origen = join(RAIZ, padre);
  if (!existsSync(origen)) return;
  mkdirSync(join(DIST, destino), { recursive: true });

  for (const entrada of readdirSync(origen)) {
    const de = join(origen, entrada);
    const a = join(DIST, destino, entrada);
    if (statSync(de).isDirectory()) copiarAssets(join(padre, entrada), join(destino, entrada));
    else copyFileSync(de, a);
  }
}

/* ---------------------------------------------------------------- */
/* Servidor estático mínimo (para revisar el resultado)              */
/* ---------------------------------------------------------------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

function servir() {
  createServer((peticion, respuesta) => {
    const limpio = decodeURIComponent(peticion.url.split('?')[0]);
    let ruta = join(DIST, limpio);

    if (!ruta.startsWith(DIST) || !existsSync(ruta) || statSync(ruta).isDirectory()) {
      ruta = join(DIST, 'index.html');
    }
    respuesta.writeHead(200, { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' });
    respuesta.end(readFileSync(ruta));
  }).listen(PUERTO, () => console.log(`  http://localhost:${PUERTO}\n`));
}

/* ---------------------------------------------------------------- */
construir();
if (process.argv.includes('--serve')) servir();
