/* ============================================================
   EL CASINO — Reservas de mesa
   Sin dependencias: habla con Supabase por REST.
   Flujo: personas → fecha → hora → datos → confirmación
   ============================================================ */
(function () {
  'use strict';

  /* ---------- CONFIGURACIÓN (rellenar tras crear el proyecto en Supabase) ---------- */
  var CFG = {
    url: 'https://zdxcwrwqlrvmsokzoocp.supabase.co',
    anonKey: 'sb_publishable_rpMkEygmQYuVE8QcgON7_g_Yv_JE3kJ',
    telefono: '689229479',
    maxPersonasWeb: 12,   // por encima de esto, se pide llamar por teléfono
    diasMaxVista: 60
  };

  var configurado = CFG.url.indexOf('TU-PROYECTO') === -1;

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  var ERRORES = {
    nombre_invalido:   'Escribe tu nombre y apellido.',
    telefono_invalido: 'El teléfono no parece correcto (mínimo 9 cifras).',
    email_invalido:    'Revisa el correo electrónico.',
    personas_invalido: 'El número de personas no es válido.',
    fuera_de_horario:  'Esa hora ya no está disponible. Elige otra, por favor.',
    fecha_bloqueada:   'Ese día no admitimos reservas. Prueba con otro.',
    sin_aforo:         'Se acaban de ocupar las últimas mesas de esa hora. Elige otra.',
    red:               'No hemos podido conectar. Revisa tu conexión e inténtalo otra vez.'
  };

  /* ---------- Estado ---------- */
  var st = { paso: 1, personas: 0, fecha: null, hora: null, mes: null, diasServicio: [], diasCerrados: [], enviando: false };
  var focoPrevio = null;
  var $overlay, $modal;

  /* ---------- Utilidades ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function iso(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function textoFecha(f) {
    var d = new Date(f + 'T12:00:00');
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function personasTxt(n) { return n + (n === 1 ? ' persona' : ' personas'); }

  function api(ruta, opciones) {
    return fetch(CFG.url + ruta, Object.assign({
      headers: {
        'apikey': CFG.anonKey,
        'Authorization': 'Bearer ' + CFG.anonKey,
        'Content-Type': 'application/json'
      }
    }, opciones || {})).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---------- Construcción del modal ---------- */
  function crearModal() {
    var el = document.createElement('div');
    el.className = 'rsv-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'rsvTitulo');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = [
      '<div class="rsv-modal">',
      '  <div class="rsv-head">',
      '    <img class="rsv-head__orange" src="assets/logo/naranja-marca.png" alt="" aria-hidden="true" />',
      '    <div class="rsv-head__txt">',
      '      <h2 id="rsvTitulo">Reservar mesa</h2>',
      '      <p>El Casino · Plaça de la Vila, 1</p>',
      '    </div>',
      '    <button type="button" class="rsv-close" id="rsvCerrar" aria-label="Cerrar">',
      '      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="rsv-pasos" aria-hidden="true">',
      '    <span class="rsv-paso is-active" data-p="1"></span>',
      '    <span class="rsv-paso" data-p="2"></span>',
      '    <span class="rsv-paso" data-p="3"></span>',
      '    <span class="rsv-paso" data-p="4"></span>',
      '  </div>',
      '  <div class="rsv-cuerpo" id="rsvCuerpo"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(el);
    $overlay = el;
    $modal = $('.rsv-modal', el);

    $('#rsvCerrar', el).addEventListener('click', cerrar);
    el.addEventListener('click', function (e) { if (e.target === el) cerrar(); });
    return el;
  }

  /* ---------- Abrir / cerrar ---------- */
  function abrir() {
    if (!$overlay) crearModal();
    focoPrevio = document.activeElement;
    st = { paso: 1, personas: 0, fecha: null, hora: null, mes: hoy(), diasServicio: st.diasServicio, diasCerrados: st.diasCerrados, enviando: false };
    $overlay.classList.add('is-open');
    $overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    pintarPaso();
    cargarDiasServicio();
    cargarDiasCerrados();
    setTimeout(function () {
      var f = $('button:not(:disabled), input', $modal);
      if (f) f.focus();
    }, 120);
  }

  function cerrar() {
    if (!$overlay) return;
    $overlay.classList.remove('is-open');
    $overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
  }

  // Teclado: Escape cierra, Tab queda atrapado dentro del modal
  document.addEventListener('keydown', function (e) {
    if (!$overlay || !$overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key !== 'Tab') return;
    var foco = $$('button:not(:disabled), input:not(:disabled), textarea, a[href]', $modal)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!foco.length) return;
    var primero = foco[0], ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });

  /* ---------- Pasos ---------- */
  function marcarPasos() {
    $$('.rsv-paso', $overlay).forEach(function (p) {
      var n = +p.getAttribute('data-p');
      p.classList.toggle('is-done', n < st.paso);
      p.classList.toggle('is-active', n === st.paso);
    });
  }

  function pintarPaso() {
    marcarPasos();
    if (st.paso === 1) pintarPersonas();
    else if (st.paso === 2) pintarCalendario();
    else if (st.paso === 3) pintarHoras();
    else if (st.paso === 4) pintarFormulario();
  }

  /* ---------- Qué días hay servicio (para no ofrecer los lunes) ---------- */
  function cargarDiasServicio() {
    if (!configurado || st.diasServicio.length) return;
    api('/rest/v1/franjas_horario?select=dia_semana&activa=eq.true')
      .then(function (filas) {
        st.diasServicio = filas.map(function (f) { return f.dia_semana; });
        if (st.paso === 2) pintarCalendario();
      })
      .catch(function () { st.diasServicio = []; });
  }

  /* ---------- Días cerrados a propósito (vacaciones, festivos, privados) ----------
     Se piden a una vista que solo expone fecha y tramo: el motivo del cierre
     es información interna y no sale de la casa. */
  function cargarDiasCerrados() {
    if (!configurado) return;
    api('/rest/v1/bloqueos_publicos?select=fecha&hora_inicio=is.null&fecha=gte.' + iso(hoy()))
      .then(function (filas) {
        st.diasCerrados = filas.map(function (b) { return b.fecha; });
        if (st.paso === 2) pintarCalendario();
      })
      .catch(function () { st.diasCerrados = []; });
  }

  /* ---------- PASO 1 · Personas ---------- */
  function pintarPersonas() {
    var chips = '';
    for (var i = 1; i <= CFG.maxPersonasWeb; i++) {
      chips += '<button type="button" class="rsv-chip' + (st.personas === i ? ' is-sel' : '') +
               '" data-n="' + i + '">' + i + '</button>';
    }
    $('#rsvCuerpo').innerHTML =
      '<h3 class="rsv-titulo">¿Cuántos sois?</h3>' +
      '<p class="rsv-ayuda">Elige el número de comensales.</p>' +
      (configurado ? '' :
        '<div class="rsv-aviso rsv-aviso--error">Las reservas online aún no están activadas. ' +
        'Llámanos al <a class="link-underline" href="tel:+34' + CFG.telefono + '">' + CFG.telefono + '</a>.</div>') +
      '<div class="rsv-personas">' + chips + '</div>' +
      '<p class="rsv-ayuda" style="margin-top:1rem">¿Sois más de ' + CFG.maxPersonasWeb + '? Llámanos al ' +
      '<a class="link-underline" href="tel:+34' + CFG.telefono + '">' + CFG.telefono + '</a> y lo organizamos.</p>';

    $$('.rsv-chip', $overlay).forEach(function (b) {
      b.addEventListener('click', function () {
        st.personas = +b.getAttribute('data-n');
        st.paso = 2;
        pintarPaso();
      });
    });
  }

  /* ---------- PASO 2 · Calendario ---------- */
  function pintarCalendario() {
    var mes = st.mes || hoy();
    var y = mes.getFullYear(), m = mes.getMonth();
    var dias = new Date(y, m + 1, 0).getDate();
    var offset = (new Date(y, m, 1).getDay() + 6) % 7;   // semana empieza en lunes
    var limite = new Date(); limite.setDate(limite.getDate() + CFG.diasMaxVista);
    var h = hoy();

    var celdas = '';
    for (var i = 0; i < offset; i++) celdas += '<span class="rsv-dia is-vacio"></span>';
    for (var d = 1; d <= dias; d++) {
      var f = new Date(y, m, d);
      var sinServicio = st.diasServicio.length > 0 && st.diasServicio.indexOf(f.getDay()) === -1;
      var cerrado = st.diasCerrados.indexOf(iso(f)) !== -1;
      var fuera = f < h || f > limite || sinServicio || cerrado;
      celdas += '<button type="button" class="rsv-dia' + (st.fecha === iso(f) ? ' is-sel' : '') + '"' +
                (fuera ? ' disabled' : '') + ' data-f="' + iso(f) + '">' + d + '</button>';
    }

    var puedeAtras = new Date(y, m, 1) > new Date(h.getFullYear(), h.getMonth(), 1);

    $('#rsvCuerpo').innerHTML =
      '<h3 class="rsv-titulo">¿Qué día?</h3>' +
      '<p class="rsv-ayuda">Mesa para ' + personasTxt(st.personas) + '.</p>' +
      '<div class="rsv-cal-nav">' +
      '  <button type="button" class="rsv-cal-btn" id="rsvMesAnt"' + (puedeAtras ? '' : ' disabled') + ' aria-label="Mes anterior">' +
      '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '  <span class="rsv-cal-mes">' + MESES[m] + ' ' + y + '</span>' +
      '  <button type="button" class="rsv-cal-btn" id="rsvMesSig" aria-label="Mes siguiente">' +
      '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>' +
      '<div class="rsv-cal-grid">' +
        DOW.map(function (x) { return '<span class="rsv-cal-dow">' + x + '</span>'; }).join('') + celdas +
      '</div>' +
      '<div class="rsv-acciones"><button type="button" class="rsv-atras" id="rsvAtras">Atrás</button></div>';

    $('#rsvMesAnt').addEventListener('click', function () { st.mes = new Date(y, m - 1, 1); pintarCalendario(); });
    $('#rsvMesSig').addEventListener('click', function () { st.mes = new Date(y, m + 1, 1); pintarCalendario(); });
    $('#rsvAtras').addEventListener('click', function () { st.paso = 1; pintarPaso(); });
    $$('.rsv-dia:not(:disabled)', $overlay).forEach(function (b) {
      b.addEventListener('click', function () {
        st.fecha = b.getAttribute('data-f');
        st.paso = 3;
        pintarPaso();
      });
    });
  }

  /* ---------- PASO 3 · Horas ---------- */
  function cabeceraHoras() {
    return '<h3 class="rsv-titulo">¿A qué hora?</h3>' +
           '<p class="rsv-ayuda">' + textoFecha(st.fecha) + ' · ' + personasTxt(st.personas) + '</p>';
  }

  function pintarHoras() {
    $('#rsvCuerpo').innerHTML = cabeceraHoras() +
      '<div class="rsv-cargando"><div class="rsv-spinner"></div>Buscando mesas libres…</div>';

    api('/rest/v1/rpc/huecos_disponibles', {
      method: 'POST',
      body: JSON.stringify({ p_fecha: st.fecha, p_personas: st.personas })
    })
      .then(function (huecos) {
        // Sin horas puede significar dos cosas muy distintas: que esté todo
        // lleno o que ese día no abramos. Preguntamos antes de dar el mensaje.
        if (huecos && huecos.length) return mostrarHoras(huecos);
        return api('/rest/v1/rpc/motivo_cierre', {
          method: 'POST',
          body: JSON.stringify({ p_fecha: st.fecha })
        }).then(function (motivo) { mostrarHoras([], motivo); })
          .catch(function () { mostrarHoras([], null); });
      })
      .catch(function () { mostrarHoras(null); });
  }

  var SIN_HORAS = {
    cerrado_puntual: 'Ese día tenemos cerrado. Prueba con otra fecha; si es algo especial, llámanos y lo miramos.',
    cierre_semanal:  'Ese día de la semana no abrimos. Elige otro día del calendario.',
    lleno:           'No quedan mesas libres a ninguna hora de ese día. Prueba con otra fecha o llámanos, que a veces se libera alguna.'
  };

  function mostrarHoras(huecos, motivo) {
    var cuerpo;
    if (huecos === null) {
      cuerpo = '<div class="rsv-aviso rsv-aviso--error">' + ERRORES.red + '</div>';
    } else if (!huecos.length) {
      cuerpo = '<div class="rsv-aviso rsv-aviso--info">' + (SIN_HORAS[motivo] || SIN_HORAS.lleno) +
               ' Teléfono: <a class="link-underline" href="tel:+34' + CFG.telefono + '">' + CFG.telefono + '</a>.</div>';
    } else {
      var comida = huecos.filter(function (x) { return x.hora < '18:00'; });
      var cena   = huecos.filter(function (x) { return x.hora >= '18:00'; });
      cuerpo = '<div class="rsv-horas">' + bloqueHoras('Comidas', comida) + bloqueHoras('Cenas', cena) + '</div>';
    }

    $('#rsvCuerpo').innerHTML = cabeceraHoras() + cuerpo +
      '<div class="rsv-acciones"><button type="button" class="rsv-atras" id="rsvAtras">Atrás</button></div>';

    $('#rsvAtras').addEventListener('click', function () { st.paso = 2; pintarPaso(); });
    $$('.rsv-chip:not(:disabled)', $overlay).forEach(function (b) {
      b.addEventListener('click', function () {
        st.hora = b.getAttribute('data-h');
        st.paso = 4;
        pintarPaso();
      });
    });
  }

  function bloqueHoras(titulo, lista) {
    if (!lista.length) return '';
    return '<span class="rsv-servicio">' + titulo + '</span>' + lista.map(function (x) {
      return '<button type="button" class="rsv-chip' + (st.hora === x.hora ? ' is-sel' : '') + '"' +
             (x.completo ? ' disabled title="Completo"' : '') +
             ' data-h="' + x.hora + '">' + x.hora + '</button>';
    }).join('');
  }

  /* ---------- PASO 4 · Datos ---------- */
  function pintarFormulario() {
    $('#rsvCuerpo').innerHTML =
      '<h3 class="rsv-titulo">Tus datos</h3>' +
      '<p class="rsv-ayuda">Solo para confirmarte la mesa.</p>' +
      '<div class="rsv-resumen">' +
      '  <div><span class="k">Día</span><span class="v">' + textoFecha(st.fecha) + '</span></div>' +
      '  <div><span class="k">Hora</span><span class="v">' + st.hora + '</span></div>' +
      '  <div><span class="k">Personas</span><span class="v">' + st.personas + '</span></div>' +
      '</div>' +
      '<div id="rsvErrorGeneral"></div>' +
      '<div class="rsv-campo"><label for="rsvNombre">Nombre y apellido *</label>' +
      '  <input type="text" id="rsvNombre" autocomplete="name" required /></div>' +
      '<div class="rsv-campo"><label for="rsvTel">Teléfono *</label>' +
      '  <input type="tel" id="rsvTel" autocomplete="tel" inputmode="tel" required /></div>' +
      '<div class="rsv-campo"><label for="rsvEmail">Email (opcional)</label>' +
      '  <input type="email" id="rsvEmail" autocomplete="email" inputmode="email" /></div>' +
      '<div class="rsv-campo"><label for="rsvNotas">Alergias o peticiones (opcional)</label>' +
      '  <textarea id="rsvNotas" rows="2"></textarea></div>' +
      '<label class="rsv-consent"><input type="checkbox" id="rsvConsent" />' +
      '  <span>Acepto que El Casino guarde estos datos para gestionar mi reserva. ' +
      '  <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.</span></label>' +
      '<div class="rsv-acciones">' +
      '  <button type="button" class="rsv-atras" id="rsvAtras">Atrás</button>' +
      '  <button type="button" class="btn btn--solid" id="rsvEnviar">Confirmar reserva</button>' +
      '</div>';

    $('#rsvAtras').addEventListener('click', function () { st.paso = 3; pintarPaso(); });
    $('#rsvEnviar').addEventListener('click', enviar);
  }

  function marcarError(id, mensaje) {
    var campo = $('#' + id).closest('.rsv-campo');
    campo.classList.add('tiene-error');
    if (!$('.rsv-error-campo', campo)) {
      var p = document.createElement('p');
      p.className = 'rsv-error-campo';
      p.textContent = mensaje;
      campo.appendChild(p);
    }
  }

  function limpiarErrores() {
    $$('.rsv-campo.tiene-error', $overlay).forEach(function (c) {
      c.classList.remove('tiene-error');
      var e = $('.rsv-error-campo', c);
      if (e && e.parentNode) e.parentNode.removeChild(e);
    });
    $('#rsvErrorGeneral').innerHTML = '';
  }

  function enviar() {
    if (st.enviando) return;
    limpiarErrores();

    var nombre = $('#rsvNombre').value.trim();
    var tel    = $('#rsvTel').value.trim();
    var email  = $('#rsvEmail').value.trim();
    var notas  = $('#rsvNotas').value.trim();
    var ok = true;

    if (nombre.split(/\s+/).filter(function (p) { return p.length > 1; }).length < 2) {
      marcarError('rsvNombre', 'Pon nombre y apellido.'); ok = false;
    }
    if (tel.replace(/\D/g, '').length < 9) {
      marcarError('rsvTel', 'Mínimo 9 cifras.'); ok = false;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      marcarError('rsvEmail', 'Ese correo no parece válido.'); ok = false;
    }
    if (!$('#rsvConsent').checked) {
      $('#rsvErrorGeneral').innerHTML =
        '<div class="rsv-aviso rsv-aviso--error">Marca la casilla para poder guardar tu reserva.</div>';
      ok = false;
    }
    if (!ok) return;

    st.enviando = true;
    var boton = $('#rsvEnviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    api('/rest/v1/rpc/crear_reserva', {
      method: 'POST',
      body: JSON.stringify({
        p_nombre: nombre,
        p_telefono: tel,
        p_email: email || null,
        p_personas: st.personas,
        p_fecha: st.fecha,
        p_hora: st.hora + ':00',
        p_notas: notas || null
      })
    })
      .then(function (r) {
        st.enviando = false;
        if (r && r.ok) { pintarConfirmacion(); return; }
        boton.disabled = false;
        boton.textContent = 'Confirmar reserva';
        var msg = (r && ERRORES[r.error]) || 'No hemos podido guardar la reserva. Inténtalo de nuevo.';
        $('#rsvErrorGeneral').innerHTML = '<div class="rsv-aviso rsv-aviso--error">' + msg + '</div>';
        // Si se quedó sin aforo o la hora ya no vale, se vuelve a elegir hora
        if (r && (r.error === 'sin_aforo' || r.error === 'fuera_de_horario')) {
          setTimeout(function () { st.paso = 3; pintarPaso(); }, 1900);
        }
      })
      .catch(function () {
        st.enviando = false;
        boton.disabled = false;
        boton.textContent = 'Confirmar reserva';
        $('#rsvErrorGeneral').innerHTML = '<div class="rsv-aviso rsv-aviso--error">' + ERRORES.red + '</div>';
      });
  }

  /* ---------- Confirmación ---------- */
  function pintarConfirmacion() {
    $$('.rsv-paso', $overlay).forEach(function (p) {
      p.classList.add('is-done');
      p.classList.remove('is-active');
    });
    $('#rsvCuerpo').innerHTML =
      '<div class="rsv-ok">' +
      '  <div class="rsv-ok__icono"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      '    <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '  <h3>¡Mesa reservada!</h3>' +
      '  <p>Te esperamos el <strong>' + textoFecha(st.fecha) + '</strong> a las <strong>' + st.hora + '</strong>.</p>' +
      '  <div class="rsv-resumen">' +
      '    <div><span class="k">Personas</span><span class="v">' + st.personas + '</span></div>' +
      '    <div><span class="k">Dónde</span><span class="v">Plaça de la Vila, 1</span></div>' +
      '  </div>' +
      '  <p class="rsv-ayuda">Si al final no puedes venir, avísanos al ' +
      '  <a class="link-underline" href="tel:+34' + CFG.telefono + '">' + CFG.telefono + '</a>.</p>' +
      '  <button type="button" class="btn btn--solid" id="rsvFin">Cerrar</button>' +
      '</div>';
    $('#rsvFin').addEventListener('click', cerrar);
  }

  /* ---------- Enganchar los botones "Reservar" de la web ---------- */
  function engancharBotones() {
    $$('a[href*="wa.me"], [data-reserva]').forEach(function (b) {
      if (!b.hasAttribute('data-reserva') && !/reserv/i.test(b.textContent)) return;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        abrir();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', engancharBotones);
  } else {
    engancharBotones();
  }

  window.CasinoReservas = { abrir: abrir, cerrar: cerrar };
})();
