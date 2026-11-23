/* ==========================================================
   TIZA · comportamiento compartido por todas las páginas
   1. Elegir sabores, uno o varios (se recuerdan, con su precio, al cambiar de página)
   2. Formulario de pedido (envía el pedido a @tizavape por Telegram)

   Los precios NO se cambian aquí: se escriben en sabores.html,
   dentro de cada caja, donde pone [PRECIO].
   ========================================================== */

(function () {
  'use strict';

  // Cuenta de Telegram que recibe los pedidos (sin la @).
  var TELEGRAM_DESTINO = 'tizavape';

  // Dirección del intermediario que manda el pedido solo (ver worker/LEEME.md).
  // Si se deja vacía, el formulario abre Telegram con el pedido ya escrito
  // y es el cliente quien pulsa enviar.
  var URL_ENVIO = '';

  var CLAVE = 'tiza-eleccion';

  /* ---------- 1. Sabores elegidos (se pueden marcar varios) ---------- */

  // Lo guardado es una lista: [{ sabor: 'Mango', precio: '19,90 €' }, ...]
  function leer() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (Array.isArray(guardado)) { return guardado.filter(function (x) { return x && x.sabor; }); }
      // formato antiguo, de cuando solo se podía elegir uno
      if (guardado && guardado.sabor) { return [guardado]; }
    } catch (e) { /* sin almacenamiento o dato roto */ }
    return [];
  }

  function guardar(lista) {
    try {
      if (lista.length) { localStorage.setItem(CLAVE, JSON.stringify(lista)); }
      else { localStorage.removeItem(CLAVE); }
    } catch (e) { /* sin almacenamiento: la elección dura solo en esta página */ }
  }

  var elegidos = leer();
  var cajas = document.querySelectorAll('[data-sabor]');
  var chivatos = document.querySelectorAll('[data-eleccion]');

  function precioDe(caja) {
    var el = caja.querySelector('.sabor__precio');
    return el ? el.textContent.trim() : '';
  }

  function posicion(sabor) {
    for (var i = 0; i < elegidos.length; i++) {
      if (elegidos[i].sabor === sabor) { return i; }
    }
    return -1;
  }

  // "Mango, Limón y Cola"
  function listaLegible() {
    var partes = elegidos.map(function (x) { return  x.sabor});
    if (partes.length < 2) { return partes.join(''); }
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }

  function pintar() {
    cajas.forEach(function (caja) {
      var i = posicion(caja.dataset.sabor);
      caja.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
      // si has cambiado un precio en el HTML, manda el del HTML
      if (i >= 0) { elegidos[i].precio = precioDe(caja); }
    });
    chivatos.forEach(function (el) {
      el.textContent = elegidos.length
        ? (el.dataset.varios || 'Has elegido %l').replace('%l', listaLegible())
        : (el.dataset.sin || '');
    });
  }

  cajas.forEach(function (caja) {
    caja.addEventListener('click', function () {
      var i = posicion(caja.dataset.sabor);
      if (i >= 0) { elegidos.splice(i, 1); }
      else { elegidos.push({ sabor: caja.dataset.sabor }); }
      guardar(elegidos);
      pintar();
    });
  });

  pintar();

  /* ---------- 2. Pedido por Telegram ---------- */

  // Mensaje predefinido que recibe @tizavape con cada pedido.
  // Cambia aquí el texto si quieres otra redacción.
  function mensajePedido(dato) {
    var usuario = dato('telegram').replace(/^@+/, '');
    return [
      'Nuevo pedido desde la web de Tiza',
      '',
      'Producto: Vape 60k usos',
      'Sabores que le interesan:',
      elegidos.length
        ? elegidos.map(function (x) { return '- ' + x.sabor ; }).join('\n')
        : '- Ninguno elegido en la web',
      '',
      'Nombre: ' + dato('nombre'),
      'Telegram del cliente: ' + (usuario ? '@' + usuario : 'no indicado'),
      '',
      'Pedido:',
      dato('mensaje')
    ].join('\n');
  }

  // Enlaces directos al chat (los que llevan data-telegram en el HTML)
  document.querySelectorAll('[data-telegram]').forEach(function (enlace) {
    enlace.href = 'https://t.me/' + TELEGRAM_DESTINO;
    enlace.textContent = '@' + TELEGRAM_DESTINO;
  });

  function enlaceChat(texto) {
    return 'https://t.me/' + TELEGRAM_DESTINO + '?text=' + encodeURIComponent(texto);
  }

  var formulario = document.querySelector('[data-pedido]');

  if (formulario) {
    var aviso = formulario.querySelector('[data-aviso]');
    var boton = formulario.querySelector('[type="submit"]');

    var dato = function (nombre) {
      var campo = formulario.elements[nombre];
      return campo ? campo.value.trim() : '';
    };

    function avisar(texto, enlace) {
      if (!aviso) { return; }
      aviso.textContent = texto;
      if (enlace) {
        var a = document.createElement('a');
        a.href = enlace;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Abrir Telegram con el pedido';
        aviso.appendChild(document.createTextNode(' '));
        aviso.appendChild(a);
      }
    }

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var texto = mensajePedido(dato);

      // Sin intermediario configurado: se abre el chat con el mensaje escrito
      if (!URL_ENVIO) {
        window.open(enlaceChat(texto), '_blank', 'noopener');
        avisar('Se ha abierto Telegram con tu pedido. Pulsa enviar para mandarlo.');
        return;
      }

      // Con intermediario: el pedido llega solo a @tizavape
      boton.disabled = true;
      avisar('Enviando tu pedido…');

      fetch(URL_ENVIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto, web: dato('web') })
      })
        .then(function (respuesta) {
          return respuesta.json().catch(function () { return {}; }).then(function (r) {
            if (!respuesta.ok || !r.ok) { throw new Error(r.error || 'Error ' + respuesta.status); }
          });
        })
        .then(function () {
          formulario.reset();
          avisar('Pedido enviado a @' + TELEGRAM_DESTINO + '. Te contestaremos por Telegram.');
        })
        .catch(function () {
          avisar('No se ha podido enviar el pedido automáticamente.', enlaceChat(texto));
        })
        .then(function () { boton.disabled = false; });
    });
  }
})();
