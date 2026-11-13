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
  SITE_URL: '',
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
   ADDRESS='Calle de la "Mayor" 4' no rompe el HTML, se renderiza bien.
   La forma {{{VARIABLE}}} inyecta el valor sin escapar (solo para JSON-LD). */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapar = (valor) => valor.replace(/[&<>"]/g, (c) => ESCAPES[c]);

function sustituir(plantilla, vars) {
  const desconocidas = new Set();

  const salida = plantilla.replace(/\{\{\{([A-Z0-9_]+)\}\}\}|\{\{([A-Z0-9_]+)\}\}/g, (match, crudo, escapado) => {
    const clave = crudo || escapado;
    if (!(clave in vars)) {
      desconocidas.add(clave);
      return match;
    }
    return crudo ? vars[clave] : escapar(vars[clave]);
  });

  return { salida, desconocidas };
}

/* ---------------------------------------------------------------- */
/* Datos estructurados (schema.org)                                  */
/* ---------------------------------------------------------------- */
/* Deben coincidir con las preguntas visibles de la sección #faq.     */
const FAQ = [
  ['¿Necesito cambiar mi Excel?',
   'No. Se importa el archivo con el formato que ya usas. Si alguna columna no se reconoce, la plataforma te avisa y te dice cuál falla.'],
  ['¿Funciona sin conexión a internet?',
   'Sí. Puede instalarse en tu propia red o servidor. Los datos de pedidos y rutas nunca salen de tu infraestructura.'],
  ['¿Cuánto tarda en calcular?',
   'Con cargas de cientos de pedidos, entre 5 y 20 segundos por optimización. Para mucho más volumen, el cálculo se pone en cola y te avisa cuando está listo.'],
  ['¿Qué pasa si un pedido no se puede servir?',
   'Aparece en una lista aparte con el motivo: capacidad, ventana imposible o distancia. Nunca desaparece en silencio.'],
  ['¿Cuánto cuesta?',
   'El precio se prepara para cada empresa, según el volumen de pedidos, el número de depósitos y las instalaciones que necesite. Cuéntanos tu caso y te enviamos una propuesta cerrada, sin permanencia.'],
  ['¿Se integra con nuestro ERP?',
   'Sí. Hay una API HTTP para exportar rutas, horas y costes, y para leer pedidos y vehículos desde tu sistema.'],
  ['¿Podemos ver antes los resultados?',
   'Sí, en una demo te mostramos la plataforma con tus propios datos y te entregamos un informe con el ahorro estimado.'],
];

function construirJsonLd(vars, baseUrl) {
  const url = baseUrl ? baseUrl + '/' : undefined;
  const id = (frag) => (url ? url + '#' + frag : undefined);
  const publisher = url ? { '@id': id('organization') } : { '@type': 'Organization', name: vars.COMPANY_NAME };

  const sameAs = [vars.LINKEDIN_URL, vars.X_URL, vars.GITHUB_URL].filter((v) => v && v.trim());

  const organizacion = {
    '@type': 'Organization',
    '@id': id('organization'),
    name: vars.COMPANY_NAME,
    url,
    logo: baseUrl ? baseUrl + '/assets/img/apple-touch-icon.png' : undefined,
    email: vars.EMAIL,
    telephone: vars.PHONE_E164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: vars.ADDRESS,
      postalCode: vars.POSTCODE,
      addressLocality: vars.CITY,
      addressCountry: vars.COUNTRY,
    },
    areaServed: vars.COUNTRY,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  const web = {
    '@type': 'WebSite',
    '@id': id('website'),
    url,
    name: vars.APP_NAME,
    description: vars.META_DESCRIPTION,
    inLanguage: 'es-ES',
    publisher,
  };

  const app = {
    '@type': 'SoftwareApplication',
    '@id': id('app'),
    name: vars.APP_NAME,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Optimización de rutas de reparto',
    operatingSystem: 'Web',
    description: vars.META_DESCRIPTION,
    url,
    inLanguage: 'es-ES',
    publisher,
    featureList: [
      'Importación de pedidos desde Excel',
      'Optimización de rutas con capacidades y ventanas horarias',
      'Cálculo sobre carretera real',
      'Planificación de flota y coste por camión',
      'Seguimiento en el mapa parada a parada',
      'API HTTP para integrar con el ERP',
    ],
  };

  const faq = {
    '@type': 'FAQPage',
    '@id': id('faq'),
    mainEntity: FAQ.map(([pregunta, respuesta]) => ({
      '@type': 'Question',
      name: pregunta,
      acceptedAnswer: { '@type': 'Answer', text: respuesta },
    })),
  };

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [organizacion, web, app, faq],
  }).replace(/</g, '\\u003c');
}

/* robots.txt y sitemap.xml solo tienen sentido con una URL absoluta. */
function escribirSeo(vars) {
  const base = vars.SITE_URL;

  if (base) {
    const hoy = new Date().toISOString().slice(0, 10);
    writeFileSync(join(DIST, 'sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${hoy}</lastmod>\n` +
      '    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n' +
      '</urlset>\n');
    writeFileSync(join(DIST, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
  } else {
    writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    console.log('  SEO: define SITE_URL (o despliega en Vercel) para canonical absoluto y sitemap.xml.');
  }
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

  // URL canónica: SITE_URL del .env o, en Vercel, el dominio de producción.
  const baseUrl = (vars.SITE_URL || '').trim().replace(/\/+$/, '') ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  vars.SITE_URL = baseUrl;
  vars.CANONICAL = baseUrl ? `${baseUrl}/` : '/';
  vars.OG_IMAGE_ABS = `${baseUrl ? baseUrl + '/' : ''}${String(vars.OG_IMAGE).replace(/^\/+/, '')}`;
  vars.JSON_LD = construirJsonLd(vars, baseUrl);

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
  escribirSeo(vars);

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
