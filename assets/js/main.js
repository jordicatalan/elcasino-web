/* ============================================================
   EL CASINO — interacciones y animaciones
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) docEl.classList.add('anim-ready');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Año footer ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Preloader ---------- */
  var pre = $('#preloader');
  function hidePre() {
    if (!pre) return;
    pre.classList.add('is-done');
    setTimeout(function () { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }, 800);
  }
  if (pre) {
    if (reduced) hidePre();
    else window.addEventListener('load', function () { setTimeout(hidePre, 350); });
    setTimeout(hidePre, 3500); // seguridad
  }

  /* ---------- Nav: estado al hacer scroll ---------- */
  var nav = $('#nav');
  var ticking = false;
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.pageYOffset > 40);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var burger = $('#navBurger'), mobile = $('#mobileMenu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (burger) { burger.setAttribute('aria-expanded', open ? 'true' : 'false'); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); }
    if (mobile) mobile.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  if (mobile) $$('a', mobile).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- Reveal al hacer scroll ---------- */
  var revEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); ro.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revEls.forEach(function (el) { ro.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Red de seguridad: si alguna animación no llegara a revelar el contenido
  // (p. ej. pestaña en segundo plano al cargar), lo mostramos igualmente.
  setTimeout(function () {
    revEls.forEach(function (el) { el.classList.add('is-visible'); });
    ['.hero__eyebrow', '.hero__title-line', '.hero__tagline', '.hero__cta'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el && parseFloat(getComputedStyle(el).opacity) === 0) { el.style.opacity = '1'; el.style.transform = 'none'; }
    });
  }, 4000);

  /* ---------- Enlace de navegación activo ---------- */
  var navLinks = $$('.nav__links a');
  var linkMap = {};
  navLinks.forEach(function (a) { linkMap[a.getAttribute('href').replace('#', '')] = a; });
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-current'); });
          if (linkMap[en.target.id]) linkMap[en.target.id].classList.add('is-current');
        }
      });
    }, { threshold: 0.5 });
    ['inicio', 'historia', 'experiencia', 'carta', 'galeria', 'opiniones', 'visitanos'].forEach(function (id) {
      var el = document.getElementById(id); if (el) so.observe(el);
    });
  }

  /* ---------- Carta: pestañas ---------- */
  var tabs = $$('.carta__tab'), panels = $$('.carta__panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var cat = tab.getAttribute('data-cat');
      tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      panels.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-panel') === cat); });
    });
  });

  /* ---------- Lightbox de galería ---------- */
  var lb = $('#lightbox'), lbImg = $('#lightboxImg'), lbVideo = $('#lightboxVideo'), lbClose = $('#lightboxClose');
  function openImg(src, alt) {
    if (!lb) return;
    lb.classList.remove('is-video');
    lbImg.src = src; lbImg.alt = alt || '';
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function openVideo(src) {
    if (!lb || !lbVideo) return;
    lb.classList.add('is-video');
    lbVideo.src = src; lbVideo.muted = false; lbVideo.currentTime = 0;
    var p = lbVideo.play(); if (p && p.catch) p.catch(function () {});
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    if (!lb) return;
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lbVideo) lbVideo.pause();
    setTimeout(function () {
      lbImg.removeAttribute('src');
      if (lbVideo) { lbVideo.removeAttribute('src'); lbVideo.load(); }
      lb.classList.remove('is-video');
    }, 400);
  }
  $$('.gal-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-type') === 'video') {
        openVideo(btn.getAttribute('data-src'));
      } else {
        var img = btn.querySelector('img');
        openImg(btn.getAttribute('data-src'), img ? img.alt : '');
      }
    });
  });
  if (lbClose) lbClose.addEventListener('click', closeLb);
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.body.classList.contains('menu-open')) setMenu(false);
      if (lb && lb.classList.contains('is-open')) closeLb();
    }
  });

  /* ---------- Horario: "Abierto ahora" ---------- */
  // Minutos desde medianoche; cierre > 1440 = madrugada del día siguiente.
  var SCHED = {
    0: [[480, 1020]],          // Domingo 08:00–17:00
    1: [],                     // Lunes cerrado
    2: [[480, 1020]],          // Martes 08:00–17:00
    3: [[480, 1020]],          // Miércoles 08:00–17:00
    4: [[480, 1530]],          // Jueves 08:00–01:30
    5: [[480, 1530]],          // Viernes 08:00–01:30
    6: [[480, 1530]]           // Sábado 08:00–01:30
  };
  function isOpenNow(now) {
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var r = SCHED[day] || [], i;
    for (i = 0; i < r.length; i++) { if (mins >= r[i][0] && mins < r[i][1]) return true; }
    var pr = SCHED[(day + 6) % 7] || [];
    for (i = 0; i < pr.length; i++) { if (pr[i][1] > 1440 && (mins + 1440) >= pr[i][0] && (mins + 1440) < pr[i][1]) return true; }
    return false;
  }
  function updateOpen() {
    var badge = $('#openBadge');
    var now = new Date();
    var open = isOpenNow(now);
    var d = window.CasinoI18N ? window.CasinoI18N.dict() : null;
    if (badge) {
      badge.classList.toggle('is-open', open);
      badge.classList.toggle('is-closed', !open);
      badge.textContent = d ? (open ? d.open_now : d.closed_now) : (open ? 'Abierto' : 'Cerrado');
    }
    $$('#hoursList li').forEach(function (li) {
      li.classList.toggle('is-today', parseInt(li.getAttribute('data-day'), 10) === now.getDay());
    });
  }
  updateOpen();
  setInterval(updateOpen, 60000);
  window.addEventListener('casino:langchange', updateOpen);

  /* ---------- Testimonios: marquesina vertical ---------- */
  (function () {
    var durations = { 0: 34, 1: 27, 2: 40 };
    $$('.op-col').forEach(function (col) {
      var cards = Array.prototype.slice.call(col.children);
      if (!cards.length) return;
      var track = document.createElement('div');
      track.className = 'op-col__track';
      cards.forEach(function (c) { track.appendChild(c); });
      cards.forEach(function (c) { var cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); track.appendChild(cl); });
      col.appendChild(track);
      var idx = parseInt(col.getAttribute('data-col'), 10) || 0;
      track.style.animationDuration = (durations[idx] || 32) + 's';
    });
  })();

  /* ---------- Vídeo del hero ---------- */
  var heroVideo = $('.hero__video');
  if (heroVideo) {
    heroVideo.muted = true;
    var tryPlay = function () { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); };
    if ('IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) tryPlay(); else heroVideo.pause(); });
      }, { threshold: 0.1 });
      vo.observe(heroVideo);
    } else { tryPlay(); }
  }

  /* ---------- Vídeos de la galería: se reproducen al hacer scroll ---------- */
  (function () {
    var vids = $$('.gal-item--video video');
    if (!vids.length) return;
    vids.forEach(function (v) { v.muted = true; });
    if ('IntersectionObserver' in window) {
      var gvo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else { v.pause(); }
        });
      }, { threshold: 0.35 });
      vids.forEach(function (v) { gvo.observe(v); });
    } else {
      vids.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    }
  })();

  /* ---------- GSAP: entrada + hero scroll-expand + parallax ---------- */
  function initGsap() {
    if (!window.gsap) return;
    var gsap = window.gsap;
    var hasST = !!window.ScrollTrigger;
    if (hasST) gsap.registerPlugin(window.ScrollTrigger);

    if (!reduced) {
      gsap.from('.hero__eyebrow, .hero__title-line, .hero__tagline, .hero__cta', {
        y: 42, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.35
      });
    }

    if (!hasST) return;

    var mm = gsap.matchMedia();

    // Solo escritorio (>=1024px): efecto scroll-expand.
    // En móvil/tablet el hero se queda a pantalla completa (CSS) para que el contenido no desborde.
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=120%', scrub: 1, pin: true, anticipatePin: 1 }
      });
      tl.fromTo('.hero__media', { scale: 0.55, borderRadius: 28 }, { scale: 1, borderRadius: 0, ease: 'none' }, 0)
        .fromTo('.hero__bg', { scale: 1.12 }, { scale: 1, ease: 'none' }, 0)
        .fromTo('.hero__bg-veil', { opacity: 0.5 }, { opacity: 0.22, ease: 'none' }, 0)
        .to('.hero__scroll', { opacity: 0, ease: 'none' }, 0);
      return function () { gsap.set(['.hero__media', '.hero__bg', '.hero__bg-veil', '.hero__scroll'], { clearProps: 'all' }); };
    });

    // Parallax sutil (solo escritorio + movimiento permitido)
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      $$('.historia__media img').forEach(function (img) {
        gsap.fromTo(img, { scale: 1.14 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: img.closest('.historia__media'), start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    // Recalcular medidas del pin cuando cargan fuentes e imágenes
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); }); }
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  if (window.gsap) initGsap();
  else window.addEventListener('load', initGsap);
})();
