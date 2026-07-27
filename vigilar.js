/**
 * Vigila content/carta.json y regenera la carta al instante.
 * Pensado para DEMOSTRACIONES en local: cambias un precio en el panel
 * y la web se actualiza en un segundo, sin esperar a Netlify.
 *
 * Uso:  node vigilar.js
 */

'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, 'content', 'carta.json');
let ocupado = false;
let pendiente = false;

function construir() {
  if (ocupado) { pendiente = true; return; }
  ocupado = true;
  const t0 = Date.now();
  execFile(process.execPath, [path.join(__dirname, 'build.js')], (err, stdout, stderr) => {
    ocupado = false;
    const ms = Date.now() - t0;
    if (err) {
      console.error('✗ Error al generar la carta:\n' + (stderr || err.message));
    } else {
      const linea = String(stdout).split('\n').filter(Boolean)[1] || '';
      console.log('✓ Carta actualizada (' + ms + ' ms) ' + linea.trim());
    }
    if (pendiente) { pendiente = false; construir(); }
  });
}

console.log('👀 Vigilando content/carta.json …');
console.log('   Cambia algo en el panel y la carta se regenera sola.');
console.log('   (Ctrl+C para parar)\n');

construir(); // una primera vez, para partir de algo actualizado

fs.watchFile(ARCHIVO, { interval: 700 }, (actual, previo) => {
  if (actual.mtimeMs !== previo.mtimeMs) {
    console.log('· Detectado un cambio en la carta…');
    construir();
  }
});
