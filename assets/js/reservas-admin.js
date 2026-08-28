/* ============================================================
   EL CASINO — Panel de reservas (uso interno)
   Ver el servicio del día, cancelar reservas, cerrar fechas
   y ajustar el aforo. Sin dependencias externas.
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    url:     'https://zdxcwrwqlrvmsokzoocp.supabase.co',
    anonKey: 'sb_publishable_rpMkEygmQYuVE8QcgON7_g_Yv_JE3kJ'
  };

  var CLAVE_SESION = 'casino-admin-sesion';
  var DIAS  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var sesion  = leerSesion();
  var pestana = 'reservas';
  var fechaVista = hoyISO();
  var bloqueoEditando  = null;   // id del cierre que se está corrigiendo
  var bloqueosCargados = [];     // último listado, para rellenar el formulario al editar

  /* ---------- utilidades ---------- */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }

  // Los nombres y las notas los escribe el cliente: nunca se pintan en crudo
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function iso(d) {
    // Fecha local, no UTC: toISOString() cambia de día por la noche
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var x = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + x;
  }
  function hoyISO() { return iso(new Date()); }
  function desdeISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hhmm(t) { return String(t || '').slice(0, 5); }

  function textoFecha(s) {
    var d = desdeISO(s);
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function sumarDias(s, n) {
    var d = desdeISO(s); d.setDate(d.getDate() + n); return iso(d);
  }

  /* ---------- sesión ---------- */

  function leerSesion() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null; }
    catch (e) { return null; }
  }
  function guardarSesion(s) {
    sesion = s;
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify(s)); } catch (e) {}
  }
  function borrarSesion() {
    sesion = null;
    try { localStorage.removeItem(CLAVE_SESION); } catch (e) {}
  }

  /* ---------- llamadas a la API ---------- */

  function pet(ruta, opts, esReintento) {
    opts = opts || {};
    var cab = {
      'apikey': CFG.anonKey,
      'Authorization': 'Bearer ' + ((sesion && sesion.access_token) || CFG.anonKey),
      'Content-Type': 'application/json'
    };
    if (opts.prefer) cab.Prefer = opts.prefer;

    return fetch(CFG.url + ruta, {
      method: opts.metodo || 'GET',
      headers: cab,
      body: opts.cuerpo ? JSON.stringify(opts.cuerpo) : undefined
    }).then(function (r) {
      // El token de Supabase caduca en una hora: se renueva y se reintenta
      if (r.status === 401 && sesion && sesion.refresh_token && !esReintento) {
        return refrescar().then(function (ok) {
          if (!ok) { borrarSesion(); pintar(); throw new Error('sesion_caducada'); }
          return pet(ruta, opts, true);
        });
      }
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      // Con Prefer:return=minimal el cuerpo llega vacío, y no solo en el 204:
      // al crear un bloqueo responde 201 sin cuerpo. Interpretarlo como JSON
      // daba un error falso cuando en realidad se había guardado bien.
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  function refrescar() {
    return fetch(CFG.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': CFG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sesion.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.access_token) return false;
        guardarSesion({ access_token: d.access_token, refresh_token: d.refresh_token,
                        email: (d.user && d.user.email) || (sesion && sesion.email) });
        return true;
      }).catch(function () { return false; });
  }

  function entrar(email, clave) {
    return fetch(CFG.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': CFG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: clave })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  function salir() {
    var t = sesion && sesion.access_token;
    borrarSesion();
    pintar();
    if (t) {
      fetch(CFG.url + '/auth/v1/logout', {
        method: 'POST',
        headers: { 'apikey': CFG.anonKey, 'Authorization': 'Bearer ' + t }
      }).catch(function () {});
    }
  }

  /* ---------- pantalla de acceso ---------- */

  function vistaLogin() {
    document.body.innerHTML =
      '<div class="pa-login"><div class="pa-login__caja">' +
      '  <div class="pa-login__cab">' +
      '    <img class="pa-login__naranja" src="assets/logo/naranja-marca.png" alt="" aria-hidden="true" />' +
      '    <img class="pa-logo" src="assets/logo/logo-casino.png" alt="El Casino Vila-real" />' +
      '    <p>Panel de reservas</p>' +
      '  </div>' +
      '  <form class="pa-login__cuerpo" id="paForm" novalidate>' +
      '    <div id="paErr"></div>' +
      '    <div class="pa-campo">' +
      '      <label for="paEmail">Correo</label>' +
      '      <input type="email" id="paEmail" autocomplete="username" required />' +
      '    </div>' +
      '    <div class="pa-campo">' +
      '      <label for="paClave">Contraseña</label>' +
      '      <input type="password" id="paClave" autocomplete="current-password" required />' +
      '    </div>' +
      '    <button type="submit" class="pa-btn pa-btn--bloque" id="paEntrar">Entrar</button>' +
      '  </form>' +
      '</div></div>';

    $('#paForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var b = $('#paEntrar');
      var email = $('#paEmail').value.trim();
      var clave = $('#paClave').value;
      if (!email || !clave) { aviso('#paErr', 'mal', 'Escribe el correo y la contraseña.'); return; }

      b.disabled = true; b.textContent = 'Entrando…';
      entrar(email, clave).then(function (r) {
        if (!r.ok || !r.d.access_token) {
          aviso('#paErr', 'mal', 'Correo o contraseña incorrectos.');
          b.disabled = false; b.textContent = 'Entrar';
          return;
        }
        guardarSesion({ access_token: r.d.access_token, refresh_token: r.d.refresh_token,
                        email: (r.d.user && r.d.user.email) || email });
        pintar();
      }).catch(function () {
        aviso('#paErr', 'mal', 'No se ha podido conectar. Revisa la conexión.');
        b.disabled = false; b.textContent = 'Entrar';
      });
    });
  }

  function aviso(donde, tipo, texto) {
    var e = $(donde);
    if (e) e.innerHTML = '<div class="pa-aviso pa-aviso--' + tipo + '">' + esc(texto) + '</div>';
  }

  /* ---------- diálogo propio ----------
     Sustituye a confirm() y alert() del navegador, que rompen la estética
     del panel y no se pueden estilar. Devuelve una promesa: true si acepta. */

  function dialogo(op) {
    return new Promise(function (resolve) {
      var antes = document.activeElement;
      var fondo = document.createElement('div');
      fondo.className = 'pa-dlg-fondo';
      fondo.innerHTML =
        '<div class="pa-dlg" role="alertdialog" aria-modal="true" aria-labelledby="paDlgT" aria-describedby="paDlgD">' +
        '  <div class="pa-dlg__cab"><h3 id="paDlgT">' + esc(op.titulo) + '</h3></div>' +
        '  <div class="pa-dlg__cuerpo" id="paDlgD">' + esc(op.texto) + '</div>' +
        '  <div class="pa-dlg__pie">' +
             (op.soloAceptar ? '' :
               '<button type="button" class="pa-btn pa-btn--gris" data-no>' +
               esc(op.cancelar || 'No, dejarlo') + '</button>') +
        '    <button type="button" class="pa-btn' + (op.peligro ? ' pa-btn--peligro' : '') +
             '" data-si>' + esc(op.aceptar || 'Aceptar') + '</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(fondo);

      var si = $('[data-si]', fondo);
      var no = $('[data-no]', fondo);

      function cerrar(valor) {
        fondo.classList.remove('is-open');
        document.removeEventListener('keydown', teclas, true);
        window.setTimeout(function () {
          fondo.remove();
          if (antes && antes.isConnected) antes.focus();
        }, 300);
        resolve(valor);
      }

      function teclas(e) {
        if (e.key === 'Escape') { e.preventDefault(); cerrar(false); return; }
        if (e.key !== 'Tab') return;
        // El foco no debe escaparse del diálogo mientras está abierto
        var f = [no, si].filter(Boolean);
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }

      si.addEventListener('click', function () { cerrar(true); });
      if (no) no.addEventListener('click', function () { cerrar(false); });
      fondo.addEventListener('mousedown', function (e) { if (e.target === fondo) cerrar(false); });
      document.addEventListener('keydown', teclas, true);

      window.requestAnimationFrame(function () {
        fondo.classList.add('is-open');
        // En algo destructivo, el foco empieza en la salida segura
        (op.peligro && no ? no : si).focus();
      });
    });
  }

  function avisar(titulo, texto) {
    return dialogo({ titulo: titulo, texto: texto, soloAceptar: true, aceptar: 'Entendido' });
  }

  /* ---------- armazón del panel ---------- */

  function vistaPanel() {
    document.body.innerHTML =
      '<header class="pa-top"><div class="pa-wrap pa-top__in">' +
      '  <div class="pa-top__marca">' +
      '    <img src="assets/logo/logo-casino.png" alt="El Casino Vila-real" />' +
      '    <span>Reservas</span>' +
      '  </div>' +
      '  <div class="pa-top__marca">' +
      '    <span class="pa-quien">' + esc((sesion && sesion.email) || '') + '</span>' +
      '    <button type="button" class="pa-btn pa-btn--fant pa-btn--peq" id="paSalir">Salir</button>' +
      '  </div>' +
      '</div></header>' +
      '<main class="pa-wrap pa-panel">' +
      '  <nav class="pa-tabs" id="paTabs">' +
      '    <button type="button" class="pa-tab" data-t="reservas">Reservas</button>' +
      '    <button type="button" class="pa-tab" data-t="bloqueos">Cerrar días</button>' +
      '    <button type="button" class="pa-tab" data-t="horario">Horario y aforo</button>' +
      '  </nav>' +
      '  <div id="paVista"></div>' +
      '</main>';

    $('#paSalir').addEventListener('click', salir);
    $('#paTabs').addEventListener('click', function (e) {
      var b = e.target.closest('.pa-tab');
      if (!b) return;
      pestana = b.dataset.t;
      bloqueoEditando = null;   // cambiar de pestaña descarta la edición a medias
      pintarPestana();
    });
    pintarPestana();
  }

  function pintarPestana() {
    $$('.pa-tab').forEach(function (b) { b.classList.toggle('is-sel', b.dataset.t === pestana); });
    if (pestana === 'reservas') vistaReservas();
    else if (pestana === 'bloqueos') vistaBloqueos();
    else vistaHorario();
  }

  function cargando(donde) {
    $(donde).innerHTML = '<div class="pa-cargando"><div class="pa-spin"></div>Cargando…</div>';
  }

  /* ---------- pestaña: reservas del día ---------- */

  function vistaReservas() {
    $('#paVista').innerHTML =
      '<div class="pa-dia">' +
      '  <button type="button" class="pa-btn pa-btn--peq" id="paAyer" ' +
      '          style="background:var(--cream-2);color:var(--ink)">‹ Anterior</button>' +
      '  <div class="pa-campo">' +
      '    <label for="paFecha">Día</label>' +
      '    <input type="date" id="paFecha" value="' + fechaVista + '" />' +
      '  </div>' +
      '  <button type="button" class="pa-btn pa-btn--peq" id="paManana" ' +
      '          style="background:var(--cream-2);color:var(--ink)">Siguiente ›</button>' +
      '  <button type="button" class="pa-btn pa-btn--peq" id="paHoy">Hoy</button>' +
      '  <div class="pa-dia__sep"></div>' +
      '</div>' +
      '<div id="paRes"></div>';

    $('#paFecha').addEventListener('change', function () { fechaVista = this.value; cargarReservas(); });
    $('#paAyer').addEventListener('click',   function () { fechaVista = sumarDias(fechaVista, -1); vistaReservas(); });
    $('#paManana').addEventListener('click', function () { fechaVista = sumarDias(fechaVista,  1); vistaReservas(); });
    $('#paHoy').addEventListener('click',    function () { fechaVista = hoyISO(); vistaReservas(); });

    cargarReservas();
  }

  function cargarReservas() {
    cargando('#paRes');
    pet('/rest/v1/reservas?select=*&fecha=eq.' + fechaVista + '&order=hora.asc,creado_en.asc')
      .then(pintarReservas)
      .catch(function (e) {
        if (e.message === 'sesion_caducada') return;
        aviso('#paRes', 'mal', 'No se han podido cargar las reservas.');
      });
  }

  function pintarReservas(lista) {
    lista = lista || [];
    var vivas = lista.filter(function (r) { return r.estado === 'confirmada'; });
    var comensales = vivas.reduce(function (s, r) { return s + r.num_personas; }, 0);

    var cab =
      '<h2 style="font-size:1.35rem;margin-bottom:1rem">' + esc(textoFecha(fechaVista)) + '</h2>' +
      '<div class="pa-resumen">' +
      '  <div class="pa-dato"><div class="pa-dato__n">' + vivas.length + '</div>' +
      '       <div class="pa-dato__t">Reservas</div></div>' +
      '  <div class="pa-dato"><div class="pa-dato__n">' + comensales + '</div>' +
      '       <div class="pa-dato__t">Comensales</div></div>' +
      '  <div class="pa-dato"><div class="pa-dato__n">' + (lista.length - vivas.length) + '</div>' +
      '       <div class="pa-dato__t">Canceladas</div></div>' +
      '</div>';

    if (!lista.length) {
      $('#paRes').innerHTML = cab +
        '<div class="pa-vacio"><strong>Ningún apunte para este día</strong>' +
        'Cuando alguien reserve, aparecerá aquí.</div>';
      return;
    }

    // Las 18:00 separan los dos servicios, igual que en la web
    var comidas = lista.filter(function (r) { return hhmm(r.hora) <  '18:00'; });
    var cenas   = lista.filter(function (r) { return hhmm(r.hora) >= '18:00'; });

    $('#paRes').innerHTML = cab + servicio('Comidas', comidas) + servicio('Cenas', cenas);

    $$('#paRes [data-cancelar]').forEach(function (b) {
      b.addEventListener('click', function () { cancelar(b.dataset.cancelar, b); });
    });
  }

  // Un servicio (comidas o cenas) con su encabezado y su recuento propio.
  // Si ese día no hay ninguno de los dos, ni se pinta el título.
  function servicio(titulo, filas) {
    if (!filas.length) return '';
    var vivas = filas.filter(function (r) { return r.estado === 'confirmada'; });
    var com   = vivas.reduce(function (s, r) { return s + r.num_personas; }, 0);
    return '<h3 class="pa-servicio">' + titulo +
           '<span>' + vivas.length + (vivas.length === 1 ? ' reserva' : ' reservas') +
           ' · ' + com + (com === 1 ? ' comensal' : ' comensales') + '</span></h3>' +
           '<div class="pa-lista">' + filas.map(tarjeta).join('') + '</div>';
  }

  function tarjeta(r) {
    var cancelada = r.estado === 'cancelada';
    var tel = String(r.telefono || '').replace(/[^0-9+]/g, '');
    return '' +
      '<article class="pa-res' + (cancelada ? ' es-cancelada' : '') + '">' +
      '  <div class="pa-res__lado">' +
      '    <div class="pa-res__hora">' + esc(hhmm(r.hora)) + '</div>' +
      '    <div class="pa-res__pers">' + r.num_personas +
           (r.num_personas === 1 ? ' persona' : ' personas') + '</div>' +
      '  </div>' +
      '  <div>' +
      '    <div class="pa-res__nombre">' + esc(r.nombre) +
           (cancelada ? ' <span class="pa-etiq pa-etiq--mal">Cancelada</span>' : '') + '</div>' +
      '    <div class="pa-res__con">' +
      '      <a href="tel:' + esc(tel) + '">' + esc(r.telefono) + '</a>' +
             (r.email ? ' · <a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '') +
      '    </div>' +
           (r.notas ? '<div class="pa-res__notas">' + esc(r.notas) + '</div>' : '') +
      '  </div>' +
      '  <div>' + (cancelada ? '' :
           '<button type="button" class="pa-btn pa-btn--peq pa-btn--mal" data-cancelar="' +
           esc(r.id) + '">Cancelar</button>') + '</div>' +
      '</article>';
  }

  function cancelar(id, boton) {
    dialogo({
      titulo: '¿Cancelar esta reserva?',
      texto: 'La mesa volverá a quedar libre para otros clientes. La reserva no se borra: ' +
             'se guarda marcada como cancelada, por si hace falta consultarla.',
      aceptar: 'Sí, cancelar', cancelar: 'No, dejarla', peligro: true
    }).then(function (ok) {
      if (!ok) return;
      boton.disabled = true; boton.textContent = 'Cancelando…';
      pet('/rest/v1/reservas?id=eq.' + encodeURIComponent(id), {
        metodo: 'PATCH',
        cuerpo: { estado: 'cancelada', cancelada_en: new Date().toISOString() },
        prefer: 'return=minimal'
      }).then(cargarReservas)
        .catch(function (e) {
          if (e.message === 'sesion_caducada') return;
          boton.disabled = false; boton.textContent = 'Cancelar';
          avisar('No se ha podido cancelar', 'Vuelve a intentarlo en unos segundos. Si sigue fallando, revisa la conexión.');
        });
    });
  }

  /* ---------- pestaña: cerrar días ---------- */

  function vistaBloqueos() {
    var ed = bloqueoEditando
      ? bloqueosCargados.filter(function (b) { return b.id === bloqueoEditando; })[0]
      : null;
    var v = function (x) { return x ? ' value="' + esc(x) + '"' : ''; };

    $('#paVista').innerHTML =
      '<div class="pa-caja">' +
      '  <h2>' + (ed ? 'Corregir este cierre' : 'Cerrar un día o un tramo') + '</h2>' +
      '  <p class="pa-caja__ayuda">' + (ed
           ? 'Cambia lo que haga falta y guarda. Si prefieres dejarlo como estaba, pulsa Descartar.'
           : 'Úsalo para vacaciones, festivos o un privado. Si dejas las horas en blanco se cierra el día entero.') +
      '  </p>' +
      '  <div id="paBloqErr"></div>' +
      '  <div class="pa-fila">' +
      '    <div class="pa-campo"><label for="pbFecha">Día</label>' +
      '      <input type="date" id="pbFecha" min="' + hoyISO() + '"' + v(ed && ed.fecha) + ' /></div>' +
      '    <div class="pa-campo"><label for="pbIni">Desde (opcional)</label>' +
      '      <input type="time" id="pbIni"' + v(ed && ed.hora_inicio && hhmm(ed.hora_inicio)) + ' /></div>' +
      '    <div class="pa-campo"><label for="pbFin">Hasta (opcional)</label>' +
      '      <input type="time" id="pbFin"' + v(ed && ed.hora_fin && hhmm(ed.hora_fin)) + ' /></div>' +
      '  </div>' +
      '  <div class="pa-campo"><label for="pbMotivo">Motivo (solo lo veis vosotros)</label>' +
      '    <input type="text" id="pbMotivo" placeholder="Vacaciones, comida de empresa…"' + v(ed && ed.motivo) + ' /></div>' +
      '  <div class="pa-acciones">' +
      '    <button type="button" class="pa-btn" id="pbCrear">' +
           (ed ? 'Guardar cambios' : 'Cerrar ese día') + '</button>' +
           (ed ? '<button type="button" class="pa-btn pa-btn--gris" id="pbDescartar">Descartar</button>' : '') +
      '  </div>' +
      '</div>' +
      '<div class="pa-caja"><h2>Días cerrados</h2>' +
      '  <p class="pa-caja__ayuda">Solo se muestran los que aún no han pasado.</p>' +
      '  <div id="paBloqLista"></div></div>';

    $('#pbCrear').addEventListener('click', guardarBloqueo);
    if (ed) {
      $('#pbDescartar').addEventListener('click', function () {
        bloqueoEditando = null;
        vistaBloqueos();
      });
    }
    cargarBloqueos();
  }

  function editarBloqueo(id) {
    bloqueoEditando = id;
    vistaBloqueos();
    // El formulario está arriba del todo: si no, parece que no ha pasado nada
    $('#paVista').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cargarBloqueos() {
    cargando('#paBloqLista');
    pet('/rest/v1/bloqueos?select=*&fecha=gte.' + hoyISO() + '&order=fecha.asc')
      .then(function (l) {
        bloqueosCargados = l || [];
        if (!l || !l.length) {
          $('#paBloqLista').innerHTML =
            '<div class="pa-vacio"><strong>No hay días cerrados</strong>El local acepta reservas con normalidad.</div>';
          return;
        }
        $('#paBloqLista').innerHTML =
          '<div class="pa-scroll"><table class="pa-tabla"><thead><tr>' +
          '<th>Día</th><th>Tramo</th><th>Motivo</th><th></th></tr></thead><tbody>' +
          l.map(function (b) {
            var tramo = b.hora_inicio
              ? esc(hhmm(b.hora_inicio)) + ' – ' + esc(hhmm(b.hora_fin))
              : '<strong>Día entero</strong>';
            return '<tr' + (b.id === bloqueoEditando ? ' style="background:var(--cream-2)"' : '') + '>' +
                   '<td>' + esc(textoFecha(b.fecha)) + '</td><td>' + tramo + '</td>' +
                   '<td>' + esc(b.motivo || '—') + '</td>' +
                   '<td><div class="pa-acciones">' +
                   '<button type="button" class="pa-btn pa-btn--peq pa-btn--gris" data-editar="' +
                   esc(b.id) + '">Editar</button>' +
                   '<button type="button" class="pa-btn pa-btn--peq pa-btn--mal" data-quitar="' +
                   esc(b.id) + '">Reabrir</button></div></td></tr>';
          }).join('') + '</tbody></table></div>';

        $$('#paBloqLista [data-quitar]').forEach(function (b) {
          b.addEventListener('click', function () { borrarBloqueo(b.dataset.quitar); });
        });
        $$('#paBloqLista [data-editar]').forEach(function (b) {
          b.addEventListener('click', function () { editarBloqueo(b.dataset.editar); });
        });
      })
      .catch(function (e) {
        if (e.message === 'sesion_caducada') return;
        aviso('#paBloqLista', 'mal', 'No se han podido cargar los días cerrados.');
      });
  }

  function guardarBloqueo() {
    var fecha  = $('#pbFecha').value;
    var ini    = $('#pbIni').value;
    var fin    = $('#pbFin').value;
    var motivo = $('#pbMotivo').value.trim();

    if (!fecha) { aviso('#paBloqErr', 'mal', 'Elige el día que quieres cerrar.'); return; }
    if ((ini && !fin) || (!ini && fin)) {
      aviso('#paBloqErr', 'mal', 'Si cierras solo un tramo, pon la hora de inicio y la de fin.'); return;
    }
    if (ini && fin && fin <= ini) {
      aviso('#paBloqErr', 'mal', 'La hora de fin tiene que ser posterior a la de inicio.'); return;
    }

    var editando = bloqueoEditando;
    var b = $('#pbCrear');
    var textoOriginal = b.textContent;
    b.disabled = true; b.textContent = 'Guardando…';

    pet(editando ? '/rest/v1/bloqueos?id=eq.' + encodeURIComponent(editando) : '/rest/v1/bloqueos', {
      metodo: editando ? 'PATCH' : 'POST',
      cuerpo: { fecha: fecha, hora_inicio: ini || null, hora_fin: fin || null, motivo: motivo || null },
      prefer: 'return=minimal'
    }).then(function () {
      bloqueoEditando = null;
      vistaBloqueos();   // repinta el formulario vacío y recarga la lista
      aviso('#paBloqErr', 'ok', editando ? 'Cierre corregido.' : 'Día cerrado. Ya no se aceptan reservas.');
    }).catch(function (e) {
      if (e.message === 'sesion_caducada') return;
      b.disabled = false; b.textContent = textoOriginal;
      aviso('#paBloqErr', 'mal', 'No se ha podido guardar. Inténtalo otra vez.');
    });
  }

  function borrarBloqueo(id) {
    dialogo({
      titulo: '¿Reabrir este día?',
      texto: 'La web volverá a aceptar reservas de mesa ese día, con el horario y el aforo de siempre.',
      aceptar: 'Sí, reabrir', cancelar: 'No, dejarlo cerrado'
    }).then(function (ok) {
      if (!ok) return;
      pet('/rest/v1/bloqueos?id=eq.' + encodeURIComponent(id), { metodo: 'DELETE', prefer: 'return=minimal' })
        .then(cargarBloqueos)
        .catch(function (e) {
          if (e.message !== 'sesion_caducada') avisar('No se ha podido reabrir', 'Vuelve a intentarlo en unos segundos.');
        });
    });
  }

  /* ---------- pestaña: horario y aforo ---------- */

  function vistaHorario() {
    $('#paVista').innerHTML =
      '<div class="pa-caja">' +
      '  <h2>Horario de reservas y aforo</h2>' +
      '  <p class="pa-caja__ayuda">Esto no es el horario de apertura del bar, sino las horas en las que ' +
      '     la web acepta reservas de mesa. <strong>Aforo</strong> es cuánta gente cabe a la vez; ' +
      '     <strong>turno</strong>, cuánto tiempo se le reserva la mesa a cada cliente.</p>' +
      '  <div id="paHorErr"></div>' +
      '  <div id="paHorLista"></div>' +
      '</div>';
    cargarFranjas();
  }

  function cargarFranjas() {
    cargando('#paHorLista');
    pet('/rest/v1/franjas_horario?select=*&order=dia_semana.asc,hora_inicio.asc')
      .then(function (l) {
        // Lunes primero, como se lee un calendario
        l.sort(function (a, b) {
          var da = (a.dia_semana + 6) % 7, db = (b.dia_semana + 6) % 7;
          return da - db || a.hora_inicio.localeCompare(b.hora_inicio);
        });
        $('#paHorLista').innerHTML =
          '<div class="pa-scroll"><table class="pa-tabla"><thead><tr>' +
          '<th>Día</th><th>Servicio</th><th>Horas</th><th>Aforo</th><th>Turno (min)</th><th>Activo</th>' +
          '</tr></thead><tbody>' +
          l.map(function (f) {
            return '<tr' + (f.activa ? '' : ' class="es-inactiva"') + ' data-f="' + esc(f.id) + '">' +
              '<td>' + DIAS[f.dia_semana] + '</td>' +
              '<td>' + esc(f.servicio) + '</td>' +
              '<td>' + esc(hhmm(f.hora_inicio)) + ' – ' + esc(hhmm(f.hora_fin)) + '</td>' +
              '<td><input type="number" min="1" max="500" value="' + f.aforo_maximo +
                  '" data-c="aforo_maximo" aria-label="Aforo" /></td>' +
              '<td><input type="number" min="15" max="480" step="15" value="' + f.duracion_min +
                  '" data-c="duracion_min" aria-label="Turno en minutos" /></td>' +
              '<td><input type="checkbox" data-c="activa"' + (f.activa ? ' checked' : '') +
                  ' aria-label="Acepta reservas" /></td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<button type="button" class="pa-btn" id="paGuardarHor" style="margin-top:1.2rem">Guardar cambios</button>';

        $('#paGuardarHor').addEventListener('click', guardarFranjas);
      })
      .catch(function (e) {
        if (e.message === 'sesion_caducada') return;
        aviso('#paHorLista', 'mal', 'No se ha podido cargar el horario.');
      });
  }

  function guardarFranjas() {
    var b = $('#paGuardarHor');
    b.disabled = true; b.textContent = 'Guardando…';

    var envios = $$('#paHorLista tbody tr').map(function (tr) {
      var cambios = {};
      $$('[data-c]', tr).forEach(function (i) {
        cambios[i.dataset.c] = i.type === 'checkbox' ? i.checked : parseInt(i.value, 10);
      });
      return pet('/rest/v1/franjas_horario?id=eq.' + encodeURIComponent(tr.dataset.f), {
        metodo: 'PATCH', cuerpo: cambios, prefer: 'return=minimal'
      });
    });

    Promise.all(envios).then(function () {
      b.disabled = false; b.textContent = 'Guardar cambios';
      aviso('#paHorErr', 'ok', 'Horario guardado. Los cambios ya se aplican en la web.');
    }).catch(function (e) {
      b.disabled = false; b.textContent = 'Guardar cambios';
      if (e.message !== 'sesion_caducada') aviso('#paHorErr', 'mal', 'No se han podido guardar los cambios.');
    });
  }

  /* ---------- arranque ---------- */

  function pintar() { if (sesion && sesion.access_token) vistaPanel(); else vistaLogin(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar);
  else pintar();
})();
