/* ==========================================================
   TIZA · comportamiento compartido por todas las páginas
   1. Elegir sabor (se recuerda, con su precio, al cambiar de página)
   2. Formulario de pedido (abre Telegram con el pedido ya escrito)

   Los precios NO se cambian aquí: se escriben en sabores.html,
   dentro de cada caja, donde pone [PRECIO].
   ========================================================== */

(function () {
  'use strict';

  // Pon aquí tu usuario de Telegram, sin la @. Ejemplo: 'tizacreatina'
  var USUARIO_TELEGRAM = '';

  var CLAVE = 'tiza-eleccion';

  /* ---------- 1. Sabor elegido ---------- */

  function leer() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (guardado && guardado.sabor) { return guardado; }
    } catch (e) { /* sin almacenamiento o dato roto */ }
    return { sabor: '', precio: '' };
  }

  function guardar(eleccion) {
    try {
      if (eleccion.sabor) { localStorage.setItem(CLAVE, JSON.stringify(eleccion)); }
      else { localStorage.removeItem(CLAVE); }
    } catch (e) { /* sin almacenamiento: la elección dura solo en esta página */ }
  }

  var eleccion = leer();
  var cajas = document.querySelectorAll('[data-sabor]');
  var chivatos = document.querySelectorAll('[data-eleccion]');

  function precioDe(caja) {
    var el = caja.querySelector('.sabor__precio');
    return el ? el.textContent.trim() : '';
  }

  function pintar() {
    cajas.forEach(function (caja) {
      var marcada = caja.dataset.sabor === eleccion.sabor;
      caja.setAttribute('aria-pressed', marcada ? 'true' : 'false');
      // si has cambiado un precio en el HTML, manda el del HTML
      if (marcada) { eleccion.precio = precioDe(caja); }
    });
    chivatos.forEach(function (el) {
      el.textContent = eleccion.sabor
        ? (el.dataset.con || '%s').replace('%s', eleccion.sabor).replace('%p', eleccion.precio)
        : (el.dataset.sin || '');
    });
  }

  cajas.forEach(function (caja) {
    caja.addEventListener('click', function () {
      eleccion = caja.dataset.sabor === eleccion.sabor
        ? { sabor: '', precio: '' }
        : { sabor: caja.dataset.sabor, precio: precioDe(caja) };
      guardar(eleccion);
      pintar();
    });
  });

  pintar();

  /* ---------- 2. Pedido por Telegram ---------- */

  // Enlaces directos al chat (los que llevan data-telegram en el HTML)
  if (USUARIO_TELEGRAM) {
    document.querySelectorAll('[data-telegram]').forEach(function (enlace) {
      enlace.href = 'https://t.me/' + USUARIO_TELEGRAM;
      enlace.textContent = '@' + USUARIO_TELEGRAM;
    });
  }

  var formulario = document.querySelector('[data-pedido]');

  if (formulario) {
    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var aviso = formulario.querySelector('[data-aviso]');

      if (!USUARIO_TELEGRAM) {
        if (aviso) { aviso.textContent = 'Falta poner el usuario de Telegram en la primera línea de app.js.'; }
        return;
      }

      var dato = function (nombre) {
        var campo = formulario.elements[nombre];
        return campo ? campo.value.trim() : '';
      };

      var texto = [
        'Hola, quiero hacer un pedido.',
        '',
        'Producto: Tiza creatina monohidrato 300 g',
        'Sabor: ' + (eleccion.sabor || 'sin elegir'),
        'Precio: ' + (eleccion.precio || 'sin indicar'),
        'Nombre: ' + dato('nombre'),
        '',
        dato('mensaje')
      ].join('\n');

      // Abre el chat de Telegram con el mensaje ya escrito, listo para enviar
      var enlace = document.createElement('a');
      enlace.href = 'https://t.me/' + USUARIO_TELEGRAM + '?text=' + encodeURIComponent(texto);
      enlace.target = '_blank';
      enlace.rel = 'noopener';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    });
  }
})();
