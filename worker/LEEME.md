# Pedidos automáticos a @tizavape

Sin esto, el formulario abre Telegram con el pedido escrito y el cliente pulsa enviar.
Con esto, el pedido llega solo a @tizavape, enviado por un bot.

Telegram no deja que una web escriba en nombre de nadie, así que el mensaje lo manda
un bot. El token del bot no puede ir en `app.js` porque el repositorio es público:
por eso va en este intermediario.

## 1. Crear el bot

1. En Telegram, abre **@BotFather** y escribe `/newbot`.
2. Ponle nombre (por ejemplo, *Pedidos Tiza*) y un usuario que acabe en `bot`.
3. Guarda el **token** que te da. No lo subas nunca al repositorio.

## 2. Que @tizavape active el bot

Un bot solo puede escribir a quien le ha escrito antes.

1. Desde la cuenta **@tizavape**, busca el bot y pulsa **Iniciar**.
2. Abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` (con tu token).
3. Busca `"chat":{"id": ...}` y apunta ese número: es el **CHAT_ID**.

## 3. Publicar el intermediario en Cloudflare (gratis)

1. Entra en dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. Borra el código de ejemplo, pega el de `telegram-worker.js` y pulsa **Deploy**.
3. En **Settings → Variables and Secrets** añade:
   - `BOT_TOKEN` (tipo *Secret*): el token del paso 1.
   - `CHAT_ID`: el número del paso 2.
   - `ORIGENES`: las direcciones desde donde se abre la web, separadas por comas.
     Por ejemplo: `https://edumoramora.github.io,http://127.0.0.1:5502`
4. Copia la dirección del Worker (algo como `https://tiza-pedidos.TU-CUENTA.workers.dev`).

## 4. Conectar la web

En `app.js`, pon esa dirección en `URL_ENVIO`:

```js
var URL_ENVIO = 'https://tiza-pedidos.TU-CUENTA.workers.dev';
```

Desde ese momento, cada pedido del formulario llega a @tizavape. Si el envío falla,
la web ofrece abrir Telegram con el pedido escrito para que no se pierda.

## El mensaje que llega

Se redacta en `app.js`, en la función `mensajePedido`. Ahí cambias el texto.
