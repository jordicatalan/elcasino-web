/**
 * EL CASINO VILA-REAL — generador de la carta
 * -------------------------------------------------------------
 * Lee  content/carta.json   (lo que edita el jefe desde /admin)
 * Genera  carta.html        (los 3 idiomas + datos para Google)
 *
 * Traducción automática desde el español:
 *   · Valencià → Apertium  (gratis, sin clave, muy bueno para es→va)
 *   · English  → DeepL si existe la variable DEEPL_API_KEY, si no MyMemory
 * Las traducciones escritas a mano en el panel SIEMPRE mandan.
 *
 * Uso:  node build.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'content', 'carta.json');
const CACHE = path.join(ROOT, 'content', 'traducciones-cache.json');
const TPL = path.join(ROOT, 'templates', 'carta.template.html');
const OUT = path.join(ROOT, 'carta.html');

const DEEPL_KEY = process.env.DEEPL_API_KEY || '';
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || '';
const SIN_RED = process.argv.includes('--sin-red');

/* ---------------- utilidades ---------------- */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ¿el precio es solo un número? (entonces no hace falta traducirlo)
const esPrecioNumerico = (p) => /^[\s\d.,]*€?[\s\d.,]*$/.test(String(p || '').trim());

async function pedir(url, opciones = {}, msTimeout = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), msTimeout);
  try {
    const r = await fetch(url, { ...opciones, signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- traductores ---------------- */

async function traducirValenciano(texto) {
  const url = 'https://beta.apertium.org/apy/translate?langpair=' +
    encodeURIComponent('spa|cat_valencia') + '&markUnknown=no&q=' + encodeURIComponent(texto);
  const j = await pedir(url, { headers: { 'User-Agent': 'ElCasinoBuild/1.0' } });
  const t = j && j.responseData && j.responseData.translatedText;
  if (!t) throw new Error('respuesta vacía de Apertium');
  return t.trim();
}

async function traducirIngles(texto) {
  if (DEEPL_KEY) {
    const host = DEEPL_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const body = new URLSearchParams({ text: texto, source_lang: 'ES', target_lang: 'EN-GB' });
    const j = await pedir('https://' + host + '/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    const t = j && j.translations && j.translations[0] && j.translations[0].text;
    if (!t) throw new Error('respuesta vacía de DeepL');
    return t.trim();
  }
  let url = 'https://api.mymemory.translated.net/get?langpair=' + encodeURIComponent('es|en') +
    '&q=' + encodeURIComponent(texto);
  if (MYMEMORY_EMAIL) url += '&de=' + encodeURIComponent(MYMEMORY_EMAIL);
  const j = await pedir(url, { headers: { 'User-Agent': 'ElCasinoBuild/1.0' } });
  const t = j && j.responseData && j.responseData.translatedText;
  if (!t) throw new Error('respuesta vacía de MyMemory');
  // MyMemory a veces devuelve avisos en mayúsculas cuando algo falla
  if (/^(MYMEMORY WARNING|QUERY LENGTH LIMIT)/i.test(t)) throw new Error('límite de MyMemory alcanzado');
  return t.trim();
}

/* ---------------- caché de traducciones ---------------- */

let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
} catch (e) {
  cache = {};
}
let cacheTocada = false;
const stats = { cacheadas: 0, traducidas: 0, manuales: 0, fallidas: 0 };

/**
 * Devuelve la traducción de `texto` al idioma `lang`.
 * Orden: manual → caché → traductor automático → español (respaldo).
 */
async function traducir(texto, lang, manual) {
  const original = String(texto || '').trim();
  if (!original) return '';

  const puesto = String(manual || '').trim();
  if (puesto) { stats.manuales++; return puesto; }

  const clave = lang + '::' + original;
  if (cache[clave]) { stats.cacheadas++; return cache[clave]; }

  if (SIN_RED) { stats.fallidas++; return original; }

  for (let intento = 1; intento <= 2; intento++) {
    try {
      const t = lang === 'va' ? await traducirValenciano(original) : await traducirIngles(original);
      if (t) {
        cache[clave] = t;
        cacheTocada = true;
        stats.traducidas++;
        await dormir(350); // no saturar las APIs gratuitas
        return t;
      }
    } catch (err) {
      if (intento === 2) {
        console.warn('   ⚠ No se pudo traducir a ' + lang.toUpperCase() + ': "' + original + '" (' + err.message + ') → se deja en español');
        stats.fallidas++;
      } else {
        await dormir(900);
      }
    }
  }
  return original; // respaldo: mejor en español que vacío
}

/* ---------------- generación ---------------- */

function precioParaGoogle(precio) {
  const m = String(precio || '').match(/(\d+)[.,](\d{1,2})/);
  if (m) return m[1] + '.' + m[2].padEnd(2, '0');
  const solo = String(precio || '').match(/^\s*(\d+)\s*€?\s*$/);
  if (solo) return solo[1] + '.00';
  return null; // "s/ mercado" y similares: sin precio estructurado
}

async function generar() {
  const datos = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const cats = Array.isArray(datos.categorias) ? datos.categorias : [];
  if (!cats.length) throw new Error('content/carta.json no tiene ninguna categoría');

  const dict = { es: {}, va: {}, en: {} };
  const bloques = [];
  const seccionesLd = [];

  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    const tc = cat.traducciones || {};
    const kCat = 'mc' + ci;
    const nombre = String(cat.nombre || '').trim();
    if (!nombre) continue;

    dict.es[kCat] = nombre;
    dict.va[kCat] = await traducir(nombre, 'va', tc.nombre_va);
    dict.en[kCat] = await traducir(nombre, 'en', tc.nombre_en);

    let html = '\n          <section class="menu-cat reveal">\n';
    html += '            <h2 class="menu-cat__title" data-i18n="' + kCat + '">' + esc(nombre) + '</h2>\n';

    const nota = String(cat.nota || '').trim();
    if (nota) {
      const kNota = kCat + 'n';
      dict.es[kNota] = nota;
      dict.va[kNota] = await traducir(nota, 'va', tc.nota_va);
      dict.en[kNota] = await traducir(nota, 'en', tc.nota_en);
      html += '            <p class="carta__note" data-i18n="' + kNota + '">' + esc(nota) + '</p>\n';
    }

    const platos = Array.isArray(cat.platos) ? cat.platos : [];
    const itemsLd = [];
    html += '            <ul class="menu-list">\n';

    for (let pi = 0; pi < platos.length; pi++) {
      const plato = platos[pi];
      const tp = plato.traducciones || {};
      const pNombre = String(plato.nombre || '').trim();
      if (!pNombre) continue;
      const pPrecio = String(plato.precio || '').trim();

      const kN = kCat + 'i' + pi;
      dict.es[kN] = pNombre;
      dict.va[kN] = await traducir(pNombre, 'va', tp.nombre_va);
      dict.en[kN] = await traducir(pNombre, 'en', tp.nombre_en);

      // El precio solo se traduce si lleva palabras (p. ej. "s/ mercado")
      let precioAttr = '';
      if (pPrecio) {
        if (esPrecioNumerico(pPrecio)) {
          precioAttr = '';
        } else {
          const kP = kN + 'p';
          dict.es[kP] = pPrecio;
          dict.va[kP] = await traducir(pPrecio, 'va', tp.precio_va);
          dict.en[kP] = await traducir(pPrecio, 'en', tp.precio_en);
          precioAttr = ' data-i18n="' + kP + '"';
        }
      }

      const precioHtml = esc(pPrecio).replace(/ €/g, '&nbsp;€');
      html += '              <li class="menu-item">' +
        '<span class="menu-item__name" data-i18n="' + kN + '">' + esc(pNombre) + '</span>' +
        '<span class="menu-item__dots"></span>' +
        '<span class="menu-item__price"' + precioAttr + '>' + precioHtml + '</span></li>\n';

      const precioLd = precioParaGoogle(pPrecio);
      const itemLd = { '@type': 'MenuItem', name: pNombre };
      if (precioLd) itemLd.offers = { '@type': 'Offer', price: precioLd, priceCurrency: 'EUR' };
      itemsLd.push(itemLd);
    }

    html += '            </ul>\n          </section>\n';
    bloques.push(html);
    seccionesLd.push({ '@type': 'MenuSection', name: nombre, hasMenuItem: itemsLd });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Carta — El Casino Vila-real',
    url: 'https://elcasinovila-real.es/carta.html',
    inLanguage: 'es',
    hasMenuSection: seccionesLd
  };

  const tpl = fs.readFileSync(TPL, 'utf8');
  const salida = tpl
    .replace('<!--{{JSONLD}}-->', JSON.stringify(jsonLd, null, 2))
    .replace('<!--{{MENU}}-->', bloques.join(''))
    .replace('<!--{{MENU_I18N}}-->', '    window.CasinoMenuI18N = ' + JSON.stringify(dict) + ';');

  fs.writeFileSync(OUT, salida, 'utf8');

  if (cacheTocada) {
    try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
  }

  const nPlatos = cats.reduce((n, c) => n + ((c.platos || []).length), 0);
  console.log('✓ carta.html generada');
  console.log('  ' + cats.length + ' categorías · ' + nPlatos + ' platos');
  console.log('  traducciones → manuales: ' + stats.manuales +
    ' · en caché: ' + stats.cacheadas +
    ' · nuevas: ' + stats.traducidas +
    (stats.fallidas ? ' · fallidas: ' + stats.fallidas : ''));
}

generar().catch((err) => {
  console.error('✗ Error generando la carta:', err.message);
  process.exit(1);
});
