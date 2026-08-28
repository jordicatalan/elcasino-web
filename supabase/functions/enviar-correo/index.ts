// ============================================================
// EL CASINO — Envío de correos de reserva
//
// La llama el disparador de la base de datos, no el navegador:
//   - al crear una reserva    -> confirmación al cliente + aviso al negocio
//   - al pasar a "cancelada"  -> aviso de cancelación a ambos
//
// Da igual quién cancele (el cliente desde el enlace, el personal desde
// el panel, o alguien desde Supabase): el correo sale siempre, porque
// cuelga del cambio de estado y no de que nadie se acuerde de avisar.
// ============================================================

const ENV = {
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  servicio:    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  resend:      Deno.env.get("RESEND_API_KEY") ?? "",
  remitente:   Deno.env.get("CORREO_REMITENTE") ?? "El Casino <onboarding@resend.dev>",
  negocio:     Deno.env.get("CORREO_NEGOCIO") ?? "",
  sitio:       (Deno.env.get("URL_SITIO") ?? "").replace(/\/+$/, ""),
  telefono:    Deno.env.get("TELEFONO_NEGOCIO") ?? "689229479",
};

// Margen para aceptar el aviso. Una reserva recién tocada dispara el correo;
// una petición repetida horas después con un id robado, no.
const MINUTOS_VALIDEZ = 10;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  num_personas: number;
  fecha: string;
  hora: string;
  notas: string | null;
  estado: string;
  creado_en: string;
  cancelada_en: string | null;
  token_cancelacion: string;
}

function esc(t: unknown): string {
  return String(t ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function textoFecha(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[f.getUTCDay()]}, ${d} de ${MESES[m - 1]} de ${a}`;
}

function reciente(marca: string | null): boolean {
  if (!marca) return false;
  const edad = Date.now() - new Date(marca).getTime();
  return edad >= -60_000 && edad <= MINUTOS_VALIDEZ * 60_000;
}

/* ---------- plantilla ---------- */

function envoltorio(titulo: string, cuerpo: string): string {
  // Tablas y estilos en línea: es lo único que respetan todos los gestores
  // de correo. Nada de flexbox ni de hojas externas aquí.
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#faf4e9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf4e9;padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;
                box-shadow:0 2px 12px rgba(26,16,8,.09);font-family:Helvetica,Arial,sans-serif;">
    <tr><td style="background:#1a1008;padding:28px 30px;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#ffffff;letter-spacing:.02em;">
        El Casino</div>
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(250,244,233,.62);margin-top:6px;">
        Vila-real</div>
    </td></tr>
    ${cuerpo}
    <tr><td style="padding:22px 30px 28px;background:#f3e9d8;text-align:center;
                   font-size:12px;line-height:1.7;color:#6b5844;">
      Plaça de la Vila, 1 · 12540 Vila-real<br />
      <a href="tel:+34${esc(ENV.telefono)}" style="color:#a8480c;text-decoration:none;">${esc(ENV.telefono)}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function filaDato(clave: string, valor: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#6b5844;">${esc(clave)}</td>
    <td style="padding:7px 0;font-size:15px;color:#241608;font-weight:bold;text-align:right;">${esc(valor)}</td>
  </tr>`;
}

function detalles(r: Reserva): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#faf4e9;border-radius:10px;padding:14px 18px;margin:18px 0;">
    ${filaDato("Día", textoFecha(r.fecha))}
    ${filaDato("Hora", r.hora.slice(0, 5))}
    ${filaDato("Personas", String(r.num_personas))}
    ${filaDato("A nombre de", r.nombre)}
    ${r.notas ? filaDato("Notas", r.notas) : ""}
  </table>`;
}

function correoNueva(r: Reserva): { asunto: string; html: string } {
  const enlace = ENV.sitio
    ? `${ENV.sitio}/cancelar.html?id=${r.id}&t=${r.token_cancelacion}`
    : "";

  const cuerpo = `<tr><td style="padding:30px;">
    <h1 style="font-family:Georgia,serif;font-size:23px;color:#241608;margin:0 0 10px;">
      Mesa reservada</h1>
    <p style="font-size:15px;line-height:1.7;color:#6b5844;margin:0;">
      Hola ${esc(r.nombre.split(" ")[0])}, tu mesa está guardada. Te esperamos.</p>
    ${detalles(r)}
    ${enlace ? `
    <p style="font-size:14px;line-height:1.7;color:#6b5844;margin:0 0 14px;">
      ¿No puedes venir al final? Cancélala tú mismo, así la mesa queda libre para otros:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="border-radius:999px;background:#a8480c;">
        <a href="${esc(enlace)}"
           style="display:inline-block;padding:13px 28px;font-size:13px;font-weight:bold;
                  letter-spacing:.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
          Cancelar mi reserva</a>
      </td></tr>
    </table>` : ""}
    <p style="font-size:13px;line-height:1.7;color:#6b5844;margin:22px 0 0;">
      Si necesitas cambiar la hora o el número de personas, llámanos al
      <a href="tel:+34${esc(ENV.telefono)}" style="color:#a8480c;">${esc(ENV.telefono)}</a>.</p>
  </td></tr>`;

  return {
    asunto: `Mesa reservada · ${textoFecha(r.fecha)} a las ${r.hora.slice(0, 5)}`,
    html: envoltorio("Mesa reservada", cuerpo),
  };
}

function correoCancelada(r: Reserva): { asunto: string; html: string } {
  const cuerpo = `<tr><td style="padding:30px;">
    <h1 style="font-family:Georgia,serif;font-size:23px;color:#241608;margin:0 0 10px;">
      Reserva cancelada</h1>
    <p style="font-size:15px;line-height:1.7;color:#6b5844;margin:0;">
      Hola ${esc(r.nombre.split(" ")[0])}, hemos anulado esta reserva. No tienes que hacer nada más.</p>
    ${detalles(r)}
    <p style="font-size:14px;line-height:1.7;color:#6b5844;margin:0;">
      Cuando quieras volver, reserva otra vez desde la web o llámanos al
      <a href="tel:+34${esc(ENV.telefono)}" style="color:#a8480c;">${esc(ENV.telefono)}</a>.
      Nos vemos pronto.</p>
  </td></tr>`;

  return {
    asunto: `Reserva cancelada · ${textoFecha(r.fecha)}`,
    html: envoltorio("Reserva cancelada", cuerpo),
  };
}

function correoNegocio(r: Reserva, tipo: string): { asunto: string; html: string } {
  const nueva = tipo === "nueva";
  const cuerpo = `<tr><td style="padding:30px;">
    <h1 style="font-family:Georgia,serif;font-size:23px;color:#241608;margin:0 0 10px;">
      ${nueva ? "Nueva reserva" : "Reserva anulada"}</h1>
    ${detalles(r)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filaDato("Teléfono", r.telefono)}
      ${r.email ? filaDato("Correo", r.email) : ""}
    </table>
  </td></tr>`;

  return {
    asunto: `${nueva ? "Nueva reserva" : "Cancelación"}: ${r.nombre}, ${r.num_personas} pers. · ` +
            `${r.fecha} ${r.hora.slice(0, 5)}`,
    html: envoltorio(nueva ? "Nueva reserva" : "Reserva anulada", cuerpo),
  };
}

/* ---------- envío ---------- */

async function enviar(para: string, asunto: string, html: string): Promise<boolean> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ENV.resend}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: ENV.remitente, to: [para], subject: asunto, html }),
  });
  if (!r.ok) {
    console.error("Resend rechazó el envío a", para, "->", r.status, await r.text());
    return false;
  }
  return true;
}

/* ---------- entrada ---------- */

Deno.serve(async (peticion) => {
  if (peticion.method !== "POST") {
    return new Response("Método no permitido", { status: 405 });
  }
  if (!ENV.resend) {
    console.error("Falta RESEND_API_KEY: no se envía nada");
    return new Response(JSON.stringify({ ok: false, error: "sin_configurar" }), { status: 500 });
  }

  let tipo = "", id = "";
  try {
    const cuerpo = await peticion.json();
    tipo = String(cuerpo.tipo ?? "");
    id   = String(cuerpo.id ?? "");
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "json_invalido" }), { status: 400 });
  }

  if (tipo !== "nueva" && tipo !== "cancelada") {
    return new Response(JSON.stringify({ ok: false, error: "tipo_invalido" }), { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(JSON.stringify({ ok: false, error: "id_invalido" }), { status: 400 });
  }

  // Los datos del correo salen de la base, nunca de la petición: quien llame
  // a esta función no puede decidir el destinatario ni el contenido.
  const consulta = await fetch(
    `${ENV.supabaseUrl}/rest/v1/reservas?id=eq.${id}&select=*`,
    { headers: { apikey: ENV.servicio, Authorization: `Bearer ${ENV.servicio}` } },
  );
  if (!consulta.ok) {
    return new Response(JSON.stringify({ ok: false, error: "consulta_fallida" }), { status: 502 });
  }
  const filas: Reserva[] = await consulta.json();
  const r = filas[0];
  if (!r) {
    return new Response(JSON.stringify({ ok: false, error: "no_encontrada" }), { status: 404 });
  }

  // Solo se avisa de lo que acaba de pasar. Repetir la llamada más tarde
  // con un id ajeno no sirve para reenviar correos.
  const marca = tipo === "nueva" ? r.creado_en : r.cancelada_en;
  if (!reciente(marca)) {
    return new Response(JSON.stringify({ ok: false, error: "fuera_de_plazo" }), { status: 409 });
  }
  if (tipo === "cancelada" && r.estado !== "cancelada") {
    return new Response(JSON.stringify({ ok: false, error: "estado_no_coincide" }), { status: 409 });
  }

  const alCliente = tipo === "nueva" ? correoNueva(r) : correoCancelada(r);
  const alNegocio = correoNegocio(r, tipo);

  const envios: Promise<boolean>[] = [];
  if (r.email) envios.push(enviar(r.email, alCliente.asunto, alCliente.html));
  if (ENV.negocio) envios.push(enviar(ENV.negocio, alNegocio.asunto, alNegocio.html));

  const hechos = await Promise.all(envios);
  return new Response(
    JSON.stringify({ ok: true, enviados: hechos.filter(Boolean).length, intentados: hechos.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
