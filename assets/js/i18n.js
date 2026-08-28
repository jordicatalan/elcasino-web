/* ============================================================
   EL CASINO — internacionalización (ES / VAL / EN)
   Auto-contenido: funciona aunque falle GSAP.
   ============================================================ */
(function () {
  'use strict';

  var I18N = {
    es: {
      skip: 'Saltar al contenido',
      nav_historia: 'Historia', nav_experiencia: 'Ambiente', nav_carta: 'Carta',
      nav_galeria: 'Galería', nav_opiniones: 'Opiniones', nav_visitanos: 'Visítanos', nav_reservar: 'Reservar',
      hero_eyebrow: 'Vila-real · Plaça de la Vila · Desde 1910',
      hero_title_1: 'El Casino',
      hero_tagline: 'El sabor de siempre, con el encanto de ahora.',
      hero_cta_carta: 'Ver la carta', hero_cta_reservar: 'Reservar mesa', hero_scroll: 'Descubre',
      historia_eyebrow: 'Nuestra historia', historia_title: 'El corazón de Vila-real, desde 1910',
      historia_p1: 'El Casino nació hace más de un siglo como punto de encuentro de la vida social de Vila-real. Hoy reabre sus puertas con una nueva mirada: mantiene el alma del edificio histórico y le añade una cocina mediterránea cuidada, café de especialidad y una terraza con encanto bajo los arcos de la plaza.',
      historia_p2: 'Aquí crecimos, aquí brindamos y aquí volvemos. Un lugar que se siente desde que te sientas.',
      fact_1_k: 'Ubicación', fact_1_v: 'Plaça de la Vila, junto al Ayuntamiento',
      fact_2_k: 'Cocina', fact_2_v: 'Mediterránea, de producto y de temporada',
      fact_3_k: 'Terraza', fact_3_v: 'Bajo los arcos históricos de la plaza',
      fact_4_k: 'Ambiente', fact_4_v: 'Desayunos, tapas, arroces y noches con música',
      exp_eyebrow: 'La experiencia', exp_title: 'Un lugar que se siente',
      exp_lead: 'Piedra centenaria, luz cálida y el murmullo de la plaza. En El Casino cada momento del día tiene su ritual: el café de la mañana, el almuerzo entre amigos, la sobremesa que no acaba y las noches con música en directo.',
      exp_c1_t: 'El interior', exp_c1_p: 'Salón acogedor para comidas de familia, de negocios o de siempre.',
      exp_c2_t: 'La terraza', exp_c2_p: 'Bajo los arcos de la Plaça de la Vila, a cualquier hora.',
      exp_c3_t: 'Las noches', exp_c3_p: 'Música en directo y buen ambiente para brindar.',
      carta_eyebrow: 'La carta', carta_title: 'Cocina mediterránea, sabor de aquí',
      carta_lead: 'Producto de temporada, arroces de los de siempre y bocados para compartir. Una selección de nuestra carta; consulta también el menú del día y las sugerencias.',
      cat_desayunos: 'Desayunos & almuerzos', cat_compartir: 'Para compartir', cat_arroces: 'Arroces', cat_principales: 'Del mercado', cat_dulces: 'Dulces & cafés',
      d1_n: 'Tostada de pan de pueblo con tomate y AOVE', d2_n: 'Tostada de aguacate, huevo poché y semillas', d3_n: 'Brioche de la casa con crema de cacao, plátano y fresas', d4_n: 'Croissant artesano con café con leche', d5_n: 'Almuerzo «El Casino»: bocadillo, bebida y café',
      c1_n: 'Tabla de quesos y frutas de temporada', c2_n: 'Tabla de embutidos ibéricos con picos', c3_n: 'Croquetas caseras de jamón (6 u.)', c4_n: 'Bravas del Casino', c5_n: 'Ensaladilla rusa con ventresca',
      arroces_note: 'Nuestros arroces se elaboran al momento (mínimo 2 personas). Precio por persona.',
      a1_n: 'Arroz senyoret con marisco', a2_n: 'Paella de marisco y alcachofa', a3_n: 'Arroz negro con sepia y alioli', a4_n: 'Fideuà de la costa',
      p1_n: 'Crudo de lubina con tomate cherry y cítricos', p2_n: 'Pulpo a la brasa con parmentier', p3_n: 'Bacalao confitado sobre pisto', p4_n: 'Presa ibérica a la brasa con patata', p5_n: 'Pescado del día a la espalda con cebolla confitada', precio_mercado: 's/ mercado',
      du1_n: 'Coulant de chocolate con helado de vainilla', du2_n: 'Tarta de queso al horno', du3_n: 'Café de especialidad', du4_n: 'Carajillo de Baileys',
      carta_disclaimer: 'Carta orientativa. Alérgenos e intolerancias: consulta a nuestro equipo. IVA incluido.',
      gal_eyebrow: 'Galería', gal_title: 'Hay sitios que lo tienen todo',
      op_eyebrow: 'Opiniones', op_title: 'Opiniones que saben mejor que cualquier ingrediente', op_lead: 'Lo que dicen quienes ya se han sentado a nuestra mesa.',
      rev_1: 'Probamos uno de sus menús, de 10, comida de la zona y un muy buen servicio.',
      rev_2: 'Un rincón con muchísimo encanto en plena Plaça de la Vila. Los desayunos son espectaculares y el trato inmejorable.',
      rev_3: 'El arroz del Casino es de otro nivel y la terraza bajo los arcos es una maravilla para desconectar.',
      rev_4: 'Volver al Casino es volver a casa. El sabor de siempre pero con un toque moderno que engancha.',
      rev_5: 'Café, buena compañía y un ambiente único. Las noches con música en directo son imprescindibles.',
      rev_6: 'Servicio atento y cercano, producto de la tierra y un local con historia. Repetiremos seguro.',
      rev_7: 'Las tablas para compartir y una copa en la terraza… el plan perfecto en Vila-real.',
      rev_8: 'Reformado con muchísimo gusto. Se nota el cariño en cada detalle y en cada plato.',
      rev_9: 'De lo mejorcito de Vila-real para almorzar. Producto, trato y ubicación inmejorables.',
      vis_eyebrow: 'Visítanos', vis_title: 'Te esperamos en la Plaça de la Vila',
      vis_dir_k: 'Dirección', vis_dir_map: 'Cómo llegar', vis_hor_k: 'Horario', vis_con_k: 'Reservas y contacto', vis_wa: 'Reservar por WhatsApp',
      day_mon: 'Lunes', day_tue: 'Martes', day_wed: 'Miércoles', day_thu: 'Jueves', day_fri: 'Viernes', day_sat: 'Sábado', day_sun: 'Domingo',
      closed: 'Cerrado', open_now: 'Abierto ahora', closed_now: 'Cerrado ahora', open_checking: '·',
      footer_tagline: 'El sabor de siempre, con el encanto de ahora.', footer_rights: 'Todos los derechos reservados.', footer_privacidad: 'Privacidad', footer_made: 'Hecho con cariño en Vila-real',
      meta_title: 'El Casino Vila-real · Cafetería y Restaurante en la Plaça de la Vila',
      meta_desc: 'El Casino de Vila-real: cafetería y restaurante mediterráneo en la histórica Plaça de la Vila. Desayunos, arroces, tapas y una terraza con encanto bajo los arcos.',
      carta_btn: 'Ver la carta completa',
      menu_title: 'Carta · El Casino Vila-real · Plaça de la Vila',
      menu_desc: 'Carta de El Casino Vila-real: desayunos, tapas y tablas para compartir, arroces mediterráneos, platos del mercado y dulces caseros. En la Plaça de la Vila.',
      menu_h1: 'Nuestra carta',
      menu_intro: 'Cocina mediterránea de producto y temporada. Desayunos, tapas, arroces de los de siempre y dulces caseros. Consulta también el menú del día y las sugerencias.',
      menu_back: 'Volver al inicio'
    },

    va: {
      skip: 'Saltar al contingut',
      nav_historia: 'Història', nav_experiencia: 'Ambient', nav_carta: 'Carta',
      nav_galeria: 'Galeria', nav_opiniones: 'Opinions', nav_visitanos: "Visita'ns", nav_reservar: 'Reservar',
      hero_eyebrow: 'Vila-real · Plaça de la Vila · Des de 1910',
      hero_title_1: 'El Casino',
      hero_tagline: "El sabor de sempre, amb l'encant d'ara.",
      hero_cta_carta: 'Veure la carta', hero_cta_reservar: 'Reservar taula', hero_scroll: 'Descobreix',
      historia_eyebrow: 'La nostra història', historia_title: 'El cor de Vila-real, des de 1910',
      historia_p1: "El Casino va nàixer fa més d'un segle com a punt de trobada de la vida social de Vila-real. Hui reobri les portes amb una nova mirada: manté l'ànima de l'edifici històric i li afig una cuina mediterrània cuidada, café d'especialitat i una terrassa amb encant davall els arcs de la plaça.",
      historia_p2: "Ací creixem, ací brindem i ací tornem. Un lloc que es sent des que t'assentes.",
      fact_1_k: 'Ubicació', fact_1_v: "Plaça de la Vila, al costat de l'Ajuntament",
      fact_2_k: 'Cuina', fact_2_v: 'Mediterrània, de producte i de temporada',
      fact_3_k: 'Terrassa', fact_3_v: 'Davall els arcs històrics de la plaça',
      fact_4_k: 'Ambient', fact_4_v: 'Esmorzars, tapes, arrossos i nits amb música',
      exp_eyebrow: "L'experiència", exp_title: 'Un lloc que es sent',
      exp_lead: "Pedra centenària, llum càlida i el murmuri de la plaça. Al Casino cada moment del dia té el seu ritual: el café del matí, l'esmorzar entre amics, la sobretaula que no s'acaba i les nits amb música en directe.",
      exp_c1_t: "L'interior", exp_c1_p: 'Saló acollidor per a menjars de família, de negocis o de sempre.',
      exp_c2_t: 'La terrassa', exp_c2_p: 'Davall els arcs de la Plaça de la Vila, a qualsevol hora.',
      exp_c3_t: 'Les nits', exp_c3_p: 'Música en directe i bon ambient per a brindar.',
      carta_eyebrow: 'La carta', carta_title: "Cuina mediterrània, sabor d'ací",
      carta_lead: 'Producte de temporada, arrossos dels de sempre i mossos per a compartir. Una selecció de la nostra carta; consulta també el menú del dia i les suggerències.',
      cat_desayunos: 'Esmorzars', cat_compartir: 'Per a compartir', cat_arroces: 'Arrossos', cat_principales: 'Del mercat', cat_dulces: 'Dolços & cafés',
      d1_n: "Torrada de pa de poble amb tomaca i oli d'oliva verge", d2_n: "Torrada d'alvocat, ou poché i llavors", d3_n: 'Brioix de la casa amb crema de cacau, plàtan i maduixes', d4_n: 'Croissant artesà amb café amb llet', d5_n: 'Esmorzar «El Casino»: entrepà, beguda i café',
      c1_n: 'Taula de formatges i fruites de temporada', c2_n: "Taula d'embotits ibèrics amb crostons", c3_n: 'Croquetes casolanes de pernil (6 u.)', c4_n: 'Braves del Casino', c5_n: 'Ensaladilla russa amb ventresca',
      arroces_note: "Els nostres arrossos s'elaboren al moment (mínim 2 persones). Preu per persona.",
      a1_n: 'Arròs senyoret amb marisc', a2_n: 'Paella de marisc i carxofa', a3_n: 'Arròs negre amb sépia i allioli', a4_n: 'Fideuà de la costa',
      p1_n: 'Cru de llobarro amb tomaca cherry i cítrics', p2_n: 'Polp a la brasa amb parmentier', p3_n: 'Bacallà confitat sobre samfaina', p4_n: 'Presa ibèrica a la brasa amb creïlla', p5_n: "Peix del dia a l'esquena amb ceba confitada", precio_mercado: 's/ mercat',
      du1_n: 'Coulant de xocolata amb gelat de vainilla', du2_n: 'Pastís de formatge al forn', du3_n: "Café d'especialitat", du4_n: 'Cigaló de Baileys',
      carta_disclaimer: "Carta orientativa. Al·lèrgens i intoleràncies: consulta el nostre equip. IVA inclòs.",
      gal_eyebrow: 'Galeria', gal_title: 'Hi ha llocs que ho tenen tot',
      op_eyebrow: 'Opinions', op_title: 'Opinions que saben millor que qualsevol ingredient', op_lead: "El que diuen els qui ja s'han assentat a la nostra taula.",
      rev_1: 'Vam provar un dels seus menús, de 10, menjar de la zona i un molt bon servici.',
      rev_2: 'Un racó amb moltíssim encant en plena Plaça de la Vila. Els esmorzars són espectaculars i el tracte immillorable.',
      rev_3: "L'arròs del Casino és d'un altre nivell i la terrassa davall els arcs és una meravella per a desconnectar.",
      rev_4: 'Tornar al Casino és tornar a casa. El sabor de sempre però amb un toc modern que enganxa.',
      rev_5: 'Café, bona companyia i un ambient únic. Les nits amb música en directe són imprescindibles.',
      rev_6: 'Servici atent i pròxim, producte de la terra i un local amb història. Repetirem segur.',
      rev_7: 'Les taules per a compartir i una copa a la terrassa… el pla perfecte a Vila-real.',
      rev_8: 'Reformat amb moltíssim gust. Es nota el carinyo en cada detall i en cada plat.',
      rev_9: "D'allò milloret de Vila-real per a esmorzar. Producte, tracte i ubicació immillorables.",
      vis_eyebrow: "Visita'ns", vis_title: "T'esperem a la Plaça de la Vila",
      vis_dir_k: 'Adreça', vis_dir_map: 'Com arribar', vis_hor_k: 'Horari', vis_con_k: 'Reserves i contacte', vis_wa: 'Reservar per WhatsApp',
      day_mon: 'Dilluns', day_tue: 'Dimarts', day_wed: 'Dimecres', day_thu: 'Dijous', day_fri: 'Divendres', day_sat: 'Dissabte', day_sun: 'Diumenge',
      closed: 'Tancat', open_now: 'Obert ara', closed_now: 'Tancat ara', open_checking: '·',
      footer_tagline: "El sabor de sempre, amb l'encant d'ara.", footer_rights: 'Tots els drets reservats.', footer_privacidad: 'Privacitat', footer_made: 'Fet amb carinyo a Vila-real',
      meta_title: 'El Casino Vila-real · Cafeteria i Restaurant a la Plaça de la Vila',
      meta_desc: 'El Casino de Vila-real: cafeteria i restaurant mediterrani a la històrica Plaça de la Vila. Esmorzars, arrossos, tapes i una terrassa amb encant davall els arcs.',
      carta_btn: 'Veure la carta completa',
      menu_title: 'Carta · El Casino Vila-real · Plaça de la Vila',
      menu_desc: 'Carta de El Casino Vila-real: esmorzars, tapes i taules per a compartir, arrossos mediterranis, plats del mercat i dolços casolans. A la Plaça de la Vila.',
      menu_h1: 'La nostra carta',
      menu_intro: 'Cuina mediterrània de producte i temporada. Esmorzars, tapes, arrossos dels de sempre i dolços casolans. Consulta també el menú del dia i les suggerències.',
      menu_back: "Tornar a l'inici"
    },

    en: {
      skip: 'Skip to content',
      nav_historia: 'Story', nav_experiencia: 'Ambience', nav_carta: 'Menu',
      nav_galeria: 'Gallery', nav_opiniones: 'Reviews', nav_visitanos: 'Visit us', nav_reservar: 'Book',
      hero_eyebrow: 'Vila-real · Plaça de la Vila · Since 1910',
      hero_title_1: 'El Casino',
      hero_tagline: 'The taste of always, with the charm of now.',
      hero_cta_carta: 'See the menu', hero_cta_reservar: 'Book a table', hero_scroll: 'Discover',
      historia_eyebrow: 'Our story', historia_title: 'The heart of Vila-real, since 1910',
      historia_p1: 'El Casino was born over a century ago as the meeting point of Vila-real’s social life. Today it reopens with a fresh outlook: it keeps the soul of the historic building and adds carefully crafted Mediterranean cuisine, specialty coffee and a charming terrace beneath the arches of the square.',
      historia_p2: 'Here we grew up, here we toast and here we return. A place you feel the moment you sit down.',
      fact_1_k: 'Location', fact_1_v: 'Plaça de la Vila, next to the Town Hall',
      fact_2_k: 'Cuisine', fact_2_v: 'Mediterranean, seasonal and produce-driven',
      fact_3_k: 'Terrace', fact_3_v: 'Beneath the historic arches of the square',
      fact_4_k: 'Atmosphere', fact_4_v: 'Breakfasts, tapas, rice dishes and live-music nights',
      exp_eyebrow: 'The experience', exp_title: 'A place you can feel',
      exp_lead: 'Century-old stone, warm light and the hum of the square. At El Casino every moment of the day has its ritual: the morning coffee, brunch with friends, the endless after-lunch chat and nights with live music.',
      exp_c1_t: 'The interior', exp_c1_p: "A cosy dining room for family meals, business lunches or old times' sake.",
      exp_c2_t: 'The terrace', exp_c2_p: 'Beneath the arches of the Plaça de la Vila, at any hour.',
      exp_c3_t: 'The nights', exp_c3_p: 'Live music and a great vibe to raise a glass.',
      carta_eyebrow: 'The menu', carta_title: 'Mediterranean cooking, the taste of here',
      carta_lead: 'Seasonal produce, classic rice dishes and bites to share. A selection from our menu; ask also about the daily menu and specials.',
      cat_desayunos: 'Breakfast & brunch', cat_compartir: 'To share', cat_arroces: 'Rice dishes', cat_principales: 'From the market', cat_dulces: 'Sweets & coffee',
      d1_n: 'Rustic bread toast with tomato and extra-virgin olive oil', d2_n: 'Avocado toast with poached egg and seeds', d3_n: 'House brioche with chocolate cream, banana and strawberries', d4_n: 'Artisan croissant with a café con leche', d5_n: '«El Casino» brunch: sandwich, drink and coffee',
      c1_n: 'Cheese board with seasonal fruit', c2_n: 'Iberian charcuterie board with breadsticks', c3_n: 'Homemade ham croquettes (6 pcs)', c4_n: 'Casino-style patatas bravas', c5_n: 'Russian salad with tuna belly',
      arroces_note: 'Our rice dishes are cooked to order (min. 2 people). Price per person.',
      a1_n: '«Senyoret» seafood rice', a2_n: 'Seafood and artichoke paella', a3_n: 'Black rice with cuttlefish and aioli', a4_n: 'Coastal fideuà (noodle paella)',
      p1_n: 'Sea bass crudo with cherry tomato and citrus', p2_n: 'Grilled octopus with potato parmentier', p3_n: 'Confit cod over pisto ratatouille', p4_n: 'Grilled Iberian pork with potatoes', p5_n: 'Catch of the day with caramelised onion', precio_mercado: 'market price',
      du1_n: 'Chocolate coulant with vanilla ice cream', du2_n: 'Baked cheesecake', du3_n: 'Specialty coffee', du4_n: 'Baileys carajillo',
      carta_disclaimer: 'Sample menu. Allergens and intolerances: please ask our team. VAT included.',
      gal_eyebrow: 'Gallery', gal_title: 'Some places have it all',
      op_eyebrow: 'Reviews', op_title: 'Reviews that taste better than any ingredient', op_lead: "What those who've already sat at our table have to say.",
      rev_1: 'We tried one of their set menus — a perfect 10, local food and great service.',
      rev_2: 'A charming corner right on the Plaça de la Vila. The breakfasts are spectacular and the service unbeatable.',
      rev_3: "The Casino's rice is on another level, and the terrace under the arches is a joy to unwind in.",
      rev_4: 'Coming back to El Casino feels like coming home. The taste of always with a modern touch that hooks you.',
      rev_5: 'Coffee, good company and a unique atmosphere. The live-music nights are a must.',
      rev_6: "Attentive, warm service, local produce and a place with history. We'll definitely be back.",
      rev_7: 'Sharing boards and a drink on the terrace… the perfect plan in Vila-real.',
      rev_8: 'Refurbished with wonderful taste. You can feel the care in every detail and every dish.',
      rev_9: 'One of the best spots in Vila-real for brunch. Produce, service and location are unbeatable.',
      vis_eyebrow: 'Visit us', vis_title: "We'll be waiting at the Plaça de la Vila",
      vis_dir_k: 'Address', vis_dir_map: 'Get directions', vis_hor_k: 'Opening hours', vis_con_k: 'Bookings & contact', vis_wa: 'Book via WhatsApp',
      day_mon: 'Monday', day_tue: 'Tuesday', day_wed: 'Wednesday', day_thu: 'Thursday', day_fri: 'Friday', day_sat: 'Saturday', day_sun: 'Sunday',
      closed: 'Closed', open_now: 'Open now', closed_now: 'Closed now', open_checking: '·',
      footer_tagline: 'The taste of always, with the charm of now.', footer_rights: 'All rights reserved.', footer_privacidad: 'Privacy', footer_made: 'Made with love in Vila-real',
      meta_title: 'El Casino Vila-real · Café & Mediterranean Restaurant',
      meta_desc: 'El Casino in Vila-real: a café and Mediterranean restaurant on the historic Plaça de la Vila. Breakfasts, rice dishes, tapas and a charming terrace beneath the arches.',
      carta_btn: 'See the full menu',
      menu_title: 'Menu · El Casino Vila-real · Plaça de la Vila',
      menu_desc: 'El Casino Vila-real menu: breakfasts, tapas and sharing boards, Mediterranean rice dishes, market plates and homemade desserts. On the Plaça de la Vila.',
      menu_h1: 'Our menu',
      menu_intro: 'Seasonal, produce-driven Mediterranean cooking. Breakfasts, tapas, classic rice dishes and homemade desserts. Ask also about the daily menu and specials.',
      menu_back: 'Back to home'
    }
  };

  var HTML_LANG = { es: 'es', va: 'ca', en: 'en' };
  var VALID = ['es', 'va', 'en'];
  var STORE = 'casino-lang';
  var current = 'es';

  // La carta la genera build.js e inyecta window.CasinoMenuI18N.
  // Se fusiona en cada cambio de idioma, así no depende del orden de carga.
  function dictDe(lang) {
    var base = I18N[lang] || I18N.es;
    var extra = window.CasinoMenuI18N && window.CasinoMenuI18N[lang];
    if (!extra) return base;
    var mezcla = {}, k;
    for (k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) mezcla[k] = base[k]; }
    for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) mezcla[k] = extra[k]; }
    return mezcla;
  }

  function apply(lang) {
    if (VALID.indexOf(lang) === -1) lang = 'es';
    current = lang;
    var dict = dictDe(lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.textContent = dict[k];
    });

    var titleKey = document.documentElement.getAttribute('data-title-key') || 'meta_title';
    var descKey = document.documentElement.getAttribute('data-desc-key') || 'meta_desc';
    if (dict[titleKey]) document.title = dict[titleKey];
    var md = document.querySelector('meta[name="description"]');
    if (md && dict[descKey]) md.setAttribute('content', dict[descKey]);

    document.documentElement.setAttribute('lang', HTML_LANG[lang] || 'es');

    document.querySelectorAll('.langswitch__btn').forEach(function (btn) {
      var on = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    try { localStorage.setItem(STORE, lang); } catch (e) {}
    window.dispatchEvent(new CustomEvent('casino:langchange', { detail: { lang: lang, dict: dict } }));
  }

  // Expose
  window.CasinoI18N = {
    apply: apply,
    dict: function () { return dictDe(current); },
    lang: function () { return current; }
  };

  function init() {
    var initial = null;
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('lang');
      if (q && VALID.indexOf(q) !== -1) initial = q;
    } catch (e) {}
    if (!initial) { try { initial = localStorage.getItem(STORE); } catch (e) {} }
    // Por defecto español (idioma base de SEO). VAL/EN se eligen con el selector.
    if (!initial || VALID.indexOf(initial) === -1) initial = 'es';
    apply(initial);

    document.querySelectorAll('.langswitch__btn').forEach(function (btn) {
      btn.addEventListener('click', function () { apply(btn.getAttribute('data-lang')); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
