# Sistema de reservas — puesta en marcha

Guía técnica del sistema de reserva de mesas de El Casino Vila-real.
Para la guía del jefe (editar la carta) mira [GUIA-CARTA.md](GUIA-CARTA.md).

---

## 1. Cómo funciona, en corto

El visitante pulsa **Reservar** en la web y se abre una ventana de cuatro pasos:
personas → día → hora → datos. La reserva se guarda en **Supabase** (Postgres),
que también decide si hay sitio.

Lo que hace especial este sistema frente a un simple formulario:

- **Cuenta comensales solapados, no huecos.** Una mesa de las 14:00 con turno de
  90 minutos sigue ocupando a las 15:00. El sistema suma todas las reservas que
  pisan cada franja y las compara con el aforo.
- **No se puede sobrerreservar.** El recuento ocurre dentro de la transacción,
  con un bloqueo por fecha y hora, así que dos personas reservando a la vez la
  última mesa no pueden colarse las dos.
- **Los datos de los clientes no son públicos.** Un visitante puede crear una
  reserva pero no leer ninguna, ni la suya. Solo el personal de la lista blanca.

### Ficheros

| Fichero | Para qué |
|---|---|
| `supabase/esquema.sql` | Tablas, permisos y funciones. Se ejecuta entero, es reejecutable |
| `supabase/functions/enviar-correo/index.ts` | Compone y envía los correos |
| `assets/js/reservas.js` | La ventana de reserva de la web |
| `assets/css/reservas.css` | Sus estilos |
| `assets/js/reservas-admin.js` | El panel del negocio |
| `assets/css/reservas-admin.css` | Sus estilos |
| `reservas-admin.html` | La página del panel |
| `cancelar.html` | Donde aterriza el enlace de cancelar del correo |
| `privacidad.html` | Política de privacidad (obligatoria: se recogen datos personales) |

---

## 2. Montarlo desde cero

### 2.1 Crear el proyecto

1. [supabase.com](https://supabase.com) → **New project**
2. Región: la más cercana a España (Londres, París o Fráncfort)
3. Guarda la contraseña de la base de datos
4. Deja marcado **Enable Data API**

### 2.2 Instalar el esquema

**SQL Editor** → pega entero `supabase/esquema.sql` → **Run**.
Debe decir *Success*. Se puede volver a ejecutar tantas veces como haga falta:
no borra datos ni duplica nada.

### 2.3 Conectar la web

De **Project Settings → API Keys** copia la **Publishable key** (`sb_publishable_…`)
y la URL del proyecto. Ponlas en el bloque `CFG` de estos **tres** ficheros:

- `assets/js/reservas.js`
- `assets/js/reservas-admin.js`
- `cancelar.html` (dentro del `<script>`)

```js
var CFG = {
  url:     'https://TU-PROYECTO.supabase.co',
  anonKey: 'sb_publishable_...'
};
```

> Esa clave **es pública a propósito**: va en el JavaScript, cualquiera puede
> verla. Lo que protege los datos son las reglas RLS del esquema, no el secreto
> de la clave. La que **nunca** debe salir de Supabase es la *secret key*
> (`sb_secret_…`).

### 2.4 Dar acceso al personal

1. **Authentication → Users → Add user → Create new user**
   Correo y contraseña de cada persona. Marca **Auto Confirm User**.
2. **SQL Editor**, para autorizarlos:

```sql
insert into public.personal (id, nombre)
select id, email from auth.users
on conflict (id) do nothing;
```

**Estar registrado no da acceso a nada.** Solo quien figura en `personal` puede
ver reservas. Es la defensa que evita que alguien que se cree una cuenta lea los
datos de los clientes.

### 2.5 Cerrar el registro público

**Authentication → Sign In / Providers** → desactiva **Allow new users to sign up**.

Es una segunda capa: aunque se reabriera por error, la lista blanca del paso
anterior sigue protegiendo los datos.

---

## 3. Correo de confirmación

Sin esto el sistema funciona, pero el cliente no recibe comprobante y no puede
cancelar por su cuenta.

### 3.1 Cuenta en Resend

1. [resend.com](https://resend.com) → *Sign up*. Gratis: 3.000 correos/mes, 100/día
2. **API Keys → Create API Key** → cópiala (`re_…`), solo se muestra una vez

### 3.2 Desplegar la función

**Desde el panel de Supabase** (lo más sencillo):
**Edge Functions → Deploy a new function** → nombre `enviar-correo` → pega el
contenido de `supabase/functions/enviar-correo/index.ts`.

**Desde la terminal**, si prefieres:

```bash
npx supabase login
npx supabase link --project-ref TU-REF-DE-PROYECTO
npx supabase functions deploy enviar-correo --no-verify-jwt
```

> `--no-verify-jwt` es necesario: quien llama a la función es la base de datos,
> que no envía sesión de usuario. La función se protege por otra vía —
> comprueba el id contra la base y **solo envía a la dirección guardada en la
> reserva**, además de rechazar avisos de más de 10 minutos de antigüedad.
> Si la despliegas desde el panel, desactiva ahí la verificación de JWT.

### 3.3 Variables de entorno

**Edge Functions → enviar-correo → Secrets** (o `npx supabase secrets set`):

| Variable | Qué es | Ejemplo |
|---|---|---|
| `RESEND_API_KEY` | La clave de Resend. **Obligatoria** | `re_a1b2c3...` |
| `CORREO_REMITENTE` | De quién sale el correo | `El Casino <onboarding@resend.dev>` |
| `CORREO_NEGOCIO` | Dónde recibe el restaurante los avisos | `reservas@elcasino.es` |
| `URL_SITIO` | Raíz de la web, **sin barra final**. Sin esto no hay enlace de cancelar | `https://elcasino.netlify.app` |
| `TELEFONO_NEGOCIO` | Aparece en el pie del correo | `689229479` |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las pone Supabase sola: no las toques.

### 3.4 Enchufar el disparador

Copia la URL de la función (**Edge Functions → enviar-correo**) y en **SQL Editor**:

```sql
update public.config
   set valor = 'https://TU-PROYECTO.supabase.co/functions/v1/enviar-correo'
 where clave = 'url_funcion_correo';
```

Mientras esa clave esté vacía **no se envía ningún correo**, pero las reservas se
guardan igual. Nunca se pierde una mesa porque falle el aviso.

### 3.5 Comprobar

Haz una reserva en la web poniendo tu correo. Deben llegarte dos:
la confirmación al cliente y el aviso al negocio. Si no llega nada, mira
**Edge Functions → enviar-correo → Logs**.

---

## 4. Modo prueba y dominio propio

**Sin dominio verificado, Resend solo envía a la dirección con la que abriste la
cuenta.** Sirve para enseñar el sistema funcionando, pero no para clientes reales:
a ellos no les llegaría nada.

Cuando tengáis el dominio:

1. Resend → **Domains → Add Domain** → escribe el dominio
2. Añade en el DNS los registros que te da (SPF, DKIM y DMARC)
3. Espera a que ponga *Verified*
4. Cambia **una sola variable**:
   `CORREO_REMITENTE` = `El Casino <reservas@tudominio.es>`
5. Actualiza `URL_SITIO` con la dirección definitiva

No hay que tocar código.

---

## 5. Qué puede hacer el negocio sin ayuda

Todo desde `reservas-admin.html` (conviene guardarlo en marcadores; no está
enlazado desde la web a propósito).

| Pestaña | Para qué |
|---|---|
| **Reservas** | El servicio del día, partido en Comidas y Cenas, con teléfono para llamar. Cancelar una reserva libera la mesa y avisa al cliente. **Editar** cambia los comensales cuando el cliente llama para decir que serán más o menos, recalculando el aforo |
| **Cerrar días** | Vacaciones, festivos o un privado. Día entero o solo un tramo. Se puede editar y reabrir |
| **Horario y aforo** | Cambiar cuánta gente cabe, cuánto dura el turno, o desactivar un servicio |

Cancelar **no borra**: la reserva queda marcada, por si hay que consultarla.

---

## 6. Ajustes que sí piden tocar código

| Qué | Dónde |
|---|---|
| Máximo de comensales por reserva web (12) | `maxPersonasWeb` en `assets/js/reservas.js` |
| Cuántos días vista se pueden reservar (60) | Clave `dias_max_vista` en la tabla `config` |
| Antelación mínima en horas (2) | Clave `antelacion_min_horas` en `config` |
| Cada cuántos minutos se ofrece hora (30) | Clave `slot_min` en `config` |
| Frontera entre comidas y cenas (18:00) | `assets/js/reservas.js` y `assets/js/reservas-admin.js` |

Las de `config` se cambian por SQL y tienen efecto inmediato, sin desplegar nada.

---

## 7. Pendiente

- En `privacidad.html` faltan **razón social**, **CIF** y **correo de contacto**
  (aparecen como `[RAZÓN SOCIAL]`, `[CIF]` y `[CORREO DE CONTACTO]`). Son datos
  del negocio y hay que rellenarlos antes de publicar de cara al público.
- El **aforo (40)** y la **duración de turno** (90 min comidas / 120 cenas) son
  valores de partida. Conviene que el jefe los confirme y los ajuste desde el panel.
