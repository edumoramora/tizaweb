/* ==========================================================
   TIZA · intermediario para mandar los pedidos a Telegram
   Se publica como Cloudflare Worker (gratis). Guarda el token
   del bot fuera del código de la web, que es pública.

   Variables que hay que poner en Cloudflare (Settings > Variables):
     BOT_TOKEN  secreto: el token que da @BotFather
     CHAT_ID    el número de chat de @tizavape con el bot
     ORIGENES   webs que pueden usarlo, separadas por comas
                ej: https://edumoramora.github.io,http://127.0.0.1:5502
   ========================================================== */

const MAX_TEXTO = 3500;

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES || '').split(',').map((o) => o.trim()).filter(Boolean);
    const origenValido = permitidos.includes(origen);

    const cabeceras = {
      'Access-Control-Allow-Origin': origenValido ? origen : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const responder = (cuerpo, estado) => new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { ...cabeceras, 'Content-Type': 'application/json; charset=utf-8' }
    });

    if (request.method === 'OPTIONS') { return new Response(null, { status: 204, headers: cabeceras }); }
    if (request.method !== 'POST') { return responder({ ok: false, error: 'Método no permitido' }, 405); }
    if (!origenValido) { return responder({ ok: false, error: 'Origen no permitido' }, 403); }

    let datos;
    try { datos = await request.json(); } catch { return responder({ ok: false, error: 'Datos no válidos' }, 400); }

    // Si un robot rellena el campo oculto, se le dice que sí y no se manda nada
    if (datos.web) { return responder({ ok: true }, 200); }

    const texto = String(datos.texto || '').trim().slice(0, MAX_TEXTO);
    if (!texto) { return responder({ ok: false, error: 'Pedido vacío' }, 400); }

    const telegram = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: texto, disable_web_page_preview: true })
    });
    const resultado = await telegram.json().catch(() => ({}));

    if (!telegram.ok || !resultado.ok) {
      return responder({ ok: false, error: 'Telegram no ha aceptado el mensaje' }, 502);
    }
    return responder({ ok: true }, 200);
  }
};
