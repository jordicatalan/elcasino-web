# El Casino Vila-real — Web

Web premium, estática y **trilingüe** (Español / Valencià / English) para El Casino, en la Plaça de la Vila de Vila-real.
No necesita servidor ni base de datos: son archivos que se suben a cualquier hosting.

---

## 1. Ver la web en tu ordenador

Haz doble clic en **`index.html`** y se abrirá en el navegador.
(Para que los vídeos y el mapa funcionen igual que en producción, mejor usar un pequeño servidor local; ver el punto 5.)

---

## 2. Estructura de archivos

```
index.html            → página principal (inicio)
carta.html            → página de la carta completa (platos y precios)
site.webmanifest      → datos de la app (nombre, colores)
robots.txt            → permiso para Google
sitemap.xml           → mapa para Google
assets/
  css/styles.css      → COLORES y diseño
  js/i18n.js          → TEXTOS en los 3 idiomas
  js/main.js          → animaciones y funciones
  img/                → fotos
  video/              → vídeos
  logo/               → logotipo
  favicon.svg         → icono de la pestaña
```

---

## 3. Cómo editar lo más habitual

### ✏️ Cambiar un texto
Los textos están en **`assets/js/i18n.js`**, ordenados en tres bloques: `es` (español), `va` (valencià) y `en` (inglés).
Busca la frase, cámbiala **en los tres idiomas** y guarda. El español también aparece en `index.html` (por SEO); cámbialo también allí si quieres que se vea sin JavaScript.

### 🍽️ Cambiar la carta / precios
La carta completa está en **`carta.html`** (en la página principal hay un botón que lleva a ella).
- Los **nombres de los platos** están en `assets/js/i18n.js` (claves `d1_n`, `c1_n`, `a1_n`, `p1_n`, `du1_n`…). Cámbialos en los tres idiomas.
- Los **precios** están en `carta.html`, dentro de `<span class="menu-item__price">`. Busca, por ejemplo, `6,90&nbsp;€` y edítalo. Si cambias precios, actualiza también el bloque `application/ld+json` del `<head>` de `carta.html` (es lo que lee Google).
> La carta actual es **de muestra**. Sustitúyela por tus platos y precios reales.

### 🎬 Vídeos de la galería
Los dos vídeos de la galería se reproducen solos al hacer scroll (sin sonido) y, al pincharlos, se abren a pantalla grande **con sonido**. Están en `assets/video/`. Para cambiarlos, sustituye el archivo (mismo nombre) o edita la ruta en la galería de `index.html`.

### 📞 Teléfono y WhatsApp
El número es **689 22 94 79**. Si cambia, busca en `index.html` todas las apariciones de `689229479` (en los enlaces `wa.me/34689229479` y `tel:+34689229479`) y reemplázalas.

### 🕒 Horario
1. En `index.html`, sección **Visítanos**, edita la lista de horas.
2. En `assets/js/main.js`, edita la tabla `SCHED` para que el aviso **"Abierto ahora / Cerrado ahora"** siga siendo correcto (los minutos: 480 = 08:00, 1020 = 17:00, 1530 = 01:30 de la madrugada).

### 🖼️ Cambiar una foto
Sustituye el archivo dentro de `assets/img/` **manteniendo el mismo nombre**, o sube uno nuevo y actualiza la ruta `src="assets/img/..."` en `index.html`. Recuerda cambiar también el texto `alt="..."` (describe la foto: ayuda al SEO y a la accesibilidad).

### 🎨 Cambiar los colores
En `assets/css/styles.css`, arriba del todo, en `:root`. Por ejemplo, el naranja de la marca es `--accent: #e8722b;`.

### ⭐ Opiniones
Están en `index.html` (sección Opiniones) y en `i18n.js` (claves `rev_1` … `rev_9`).
La primera (Enrique Caballero) es una **reseña real de Google**; las demás son **de ejemplo**: sustitúyelas por reseñas reales cuando quieras.

---

## 4. Antes de publicar (IMPORTANTE)

La web usa un dominio de ejemplo: **`elcasinovila-real.es`**.
Cuando tengas tu dominio real, haz "Buscar y reemplazar" de `elcasinovila-real.es` por el tuyo en estos archivos:
`index.html`, `robots.txt`, `sitemap.xml`.
Esto es necesario para que el SEO (Google), las redes sociales y el mapa del sitio funcionen bien.

---

## 5. Publicar en un hosting (Hostinger, etc.)

1. Selecciona **todo el contenido de esta carpeta** (index.html, site.webmanifest, robots.txt, sitemap.xml y la carpeta `assets/`).
2. En el **Administrador de archivos** de tu hosting, entra en la carpeta `public_html`.
3. **Arrastra y suelta** los archivos ahí (o súbelos como .zip y descomprímelos dentro de `public_html`).
4. ¡Listo! Tu web estará en tu dominio.

> No hace falta subir la carpeta `elcasino.vila_real_20260724_130019_post` (son las fotos originales de Instagram) ni la carpeta `.claude`.

### Servidor local para previsualizar (opcional)
Con Python instalado, abre una terminal en esta carpeta y ejecuta:
```
python -m http.server 8000
```
Luego abre `http://localhost:8000` en el navegador.

---

## 6. Notas sobre idiomas y SEO

- El idioma por defecto es **español** (el que ve Google y el visitante por primera vez).
- El botón **ES / VAL / EN** de la cabecera cambia el idioma al instante y recuerda la preferencia.
- También se puede enlazar directamente a un idioma: `tudominio.es/?lang=va` o `?lang=en`.
- La web ya incluye: etiquetas para Google y redes (Open Graph), datos estructurados de restaurante (schema.org con dirección, teléfono y horario), `sitemap.xml` y `robots.txt`.

---

Hecho con cariño para El Casino · Plaça de la Vila, 1 · 12540 Vila-real (Castelló)
