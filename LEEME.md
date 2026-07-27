# El Casino Vila-real — Web

Web premium, estática y **trilingüe** (Español / Valencià / English) para El Casino, en la Plaça de la Vila de Vila-real.
Incluye un **panel de administración** para que el dueño cambie la carta cuando quiera.

- 📄 Guía para el jefe (cómo cambiar la carta): **[GUIA-CARTA.md](GUIA-CARTA.md)**
- 🔧 Este archivo: cómo está montado y cómo publicarlo.

---

## 1. Puesta en marcha del panel (SOLO LA PRIMERA VEZ)

El panel necesita que la web se publique **desde GitHub**, no arrastrando la carpeta.
Son 5 pasos y se hacen una sola vez.

### Paso 1 · Subir el proyecto a GitHub
El repositorio ya está creado y con el primer commit hecho. Solo falta enviarlo:

1. Entra en [github.com/new](https://github.com/new) y crea un repositorio **privado** llamado `elcasino-web` (sin README ni .gitignore).
2. En una terminal, dentro de esta carpeta, ejecuta (cambia `TU-USUARIO`):

```bash
git remote add origin https://github.com/TU-USUARIO/elcasino-web.git
git push -u origin main
```

### Paso 2 · Conectar Netlify a GitHub
1. En Netlify: **Add new site → Import an existing project → GitHub**.
2. Elige el repositorio `elcasino-web`.
3. Netlify leerá `netlify.toml` y pondrá solo la configuración:
   - Build command: `node build.js`
   - Publish directory: `.`
4. Pulsa **Deploy**.

> Si ya tenías el sitio creado arrastrando la carpeta, puedes conectarlo en
> *Site configuration → Build & deploy → Link repository*, y así conservas el dominio.

### Paso 3 · Activar el acceso (Identity)
1. En tu sitio de Netlify: **Site configuration → Identity → Enable Identity**.
2. En **Registration**, elige **Invite only** (solo por invitación). Importante.
3. Baja hasta **Services → Git Gateway** y pulsa **Enable Git Gateway**.

### Paso 4 · Invitar al dueño
1. Pestaña **Identity → Invite users**.
2. Escribe su email y envía.
3. Le llegará un correo; al pincharlo elige contraseña y entra directo al panel.

### Paso 5 · Comprobar
Entra en `https://tusitio.netlify.app/admin` y prueba a cambiar un precio.

---

## 2. Cómo funciona la carta (importante)

```
content/carta.json   ←  lo que edita el jefe desde /admin
        ↓  (node build.js, lo lanza Netlify solo)
carta.html           ←  GENERADO. No lo edites a mano.
```

Al guardar en el panel:
1. Se guarda `content/carta.json` en GitHub.
2. Netlify lanza `node build.js`.
3. El script **traduce lo que falte** y regenera `carta.html` con los 3 idiomas y los datos para Google.
4. La web queda actualizada (~2 minutos).

### Traducción automática
| Idioma | Motor | Notas |
|---|---|---|
| Valencià | Apertium | Gratis, sin clave. Muy bueno (usa *creïlla*, *tomaca*…) |
| English | MyMemory (o DeepL) | Gratis. Ver abajo cómo mejorarlo |

Las traducciones escritas a mano en el panel (*«Corregir traducciones»*) **siempre mandan**.
Si un traductor falla, se deja el texto en español (nunca se rompe la web).

**Mejorar el inglés (opcional, recomendado):** con una clave gratuita de
[DeepL API Free](https://www.deepl.com/pro-api) la calidad sube mucho.
En Netlify: *Site configuration → Environment variables → Add*:
- Clave: `DEEPL_API_KEY`
- Valor: tu clave (termina en `:fx`)

---

## 3. Estructura de archivos

```
index.html            → página principal
carta.html            → GENERADA por build.js (no editar)
build.js              → genera la carta y traduce
content/carta.json    → LOS DATOS DE LA CARTA (lo que edita el panel)
templates/            → plantilla de la página de carta
admin/                → el panel de administración
netlify.toml          → configuración de publicación
assets/
  css/styles.css      → colores y diseño
  js/i18n.js          → textos fijos en los 3 idiomas
  js/main.js          → animaciones y funciones
  img/ video/ logo/   → fotos, vídeos y logotipos
```

---

## 4. Editar otras cosas (no la carta)

### ✏️ Textos de la web (no de la carta)
Están en `assets/js/i18n.js`, en tres bloques: `es`, `va` y `en`. Cámbialos en los tres.
El español también aparece en `index.html` (por SEO).

### 📞 Teléfono y WhatsApp
Busca `689229479` en `index.html` y `templates/carta.template.html` y reemplázalo.

### 🕒 Horario
1. En `index.html`, sección **Visítanos**, edita la lista.
2. En `assets/js/main.js`, edita la tabla `SCHED` para que el aviso «Abierto ahora» siga bien
   (480 = 08:00, 1020 = 17:00, 1530 = 01:30 de la madrugada).

### 🖼️ Fotos de la galería
Sustituye el archivo en `assets/img/` con el mismo nombre, o cambia la ruta en `index.html`.
Actualiza también el texto `alt="..."` (ayuda al SEO).

### 🎬 Vídeos de la galería
Se reproducen solos al hacer scroll (sin sonido) y al pincharlos se abren con sonido.
Están en `assets/video/`.

### 🎨 Colores
En `assets/css/styles.css`, arriba del todo, en `:root`.

---

## 5. Trabajar en local

```bash
node build.js
```
Genera `carta.html`. Luego, para ver la web:
```bash
python -m http.server 8000
```
Y abre `http://localhost:8000`.

> Si cambias `styles.css`, `i18n.js` o `main.js`, sube el número de `?v=2`
> en `index.html` y `templates/carta.template.html` para que a los visitantes
> no se les quede la versión antigua guardada.

---

## 6. Antes de publicar con dominio propio

La web usa un dominio de ejemplo: **`elcasinovila-real.es`**.
Cuando tengas el definitivo, haz «Buscar y reemplazar» en:
`index.html`, `templates/carta.template.html`, `build.js`, `robots.txt` y `sitemap.xml`.

---

## 7. Publicar sin GitHub (método antiguo)

Si algún día quieres volver a arrastrar la carpeta a Netlify, ejecuta `node build.js`
y sube: `index.html`, `carta.html`, `site.webmanifest`, `robots.txt`, `sitemap.xml` y `assets/`.
⚠️ Con este método **el panel de administración no funciona**.

---

*Hecho con cariño para El Casino · Plaça de la Vila, 1 · 12540 Vila-real (Castelló)*
