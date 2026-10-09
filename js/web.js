/* Mimbise — página web: modo día/noche, menú del celular, filtros del catálogo y compartir. */
(function () {
  "use strict";

  // ---- Día (07:00–18:59) / Noche (19:00–06:59), con la hora del equipo del cliente ----
  // Para probar: agregar ?tema=dia o ?tema=noche a la dirección.
  function temaSegunHora() {
    var forzado = new URLSearchParams(location.search).get("tema");
    if (forzado === "dia" || forzado === "noche") return forzado;
    var h = new Date().getHours();
    return h >= 7 && h < 19 ? "dia" : "noche";
  }
  function aplicarTema() {
    var t = temaSegunHora();
    if (document.documentElement.getAttribute("data-tema") !== t) document.documentElement.setAttribute("data-tema", t);
  }
  aplicarTema();
  setInterval(aplicarTema, 60000);   // si el cliente deja la página abierta, cambia sola a las 07:00 / 19:00

  // ---- Video de portada: asegurar que arranque (sin sonido) ----
  var video = document.querySelector(".hero-video");
  if (video) {
    var reproducir = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    reproducir();
    document.addEventListener("visibilitychange", function () { if (!document.hidden) reproducir(); });
  }

  // ---- Menú del celular ----
  var cajon = document.querySelector(".cajon");
  document.querySelectorAll("[data-abrir-menu]").forEach(function (b) {
    b.addEventListener("click", function () { cajon.classList.add("abierto"); document.body.style.overflow = "hidden"; });
  });
  document.querySelectorAll("[data-cerrar-menu]").forEach(function (b) {
    b.addEventListener("click", function () { cajon.classList.remove("abierto"); document.body.style.overflow = ""; });
  });

  // ---- Catálogo: categoría, búsqueda, promos y orden ----
  var grilla = document.querySelector("[data-catalogo]");
  if (grilla) {
    var tarjetas = Array.prototype.slice.call(grilla.querySelectorAll(".card"));
    var botones = document.querySelectorAll("[data-cat]");
    var buscador = document.querySelector("[data-buscar]");
    var orden = document.querySelector("[data-orden]");
    var contador = document.querySelector("[data-contador]");
    var vacio = document.querySelector("[data-vacio]");
    var params = new URLSearchParams(location.search);
    var estado = { cat: params.get("cat") || "", q: params.get("q") || "", orden: params.get("orden") || "novedades" };

    function sinAcentos(t) { return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

    function actualizarDireccion() {
      var p = new URLSearchParams();
      if (estado.cat) p.set("cat", estado.cat);
      if (estado.q) p.set("q", estado.q);
      if (estado.orden !== "novedades") p.set("orden", estado.orden);
      var tema = new URLSearchParams(location.search).get("tema");
      if (tema) p.set("tema", tema);
      var q = p.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    }

    function aplicar() {
      var palabras = sinAcentos(estado.q).split(/\s+/).filter(Boolean);
      var visibles = 0;
      tarjetas.forEach(function (c) {
        var okCat = !estado.cat || (estado.cat === "promos" ? c.dataset.promo === "1" : c.dataset.categoria === estado.cat);
        var texto = c.dataset.texto;
        var okQ = palabras.every(function (w) { return texto.indexOf(w) !== -1; });
        var ver = okCat && okQ;
        c.classList.toggle("oculto", !ver);
        if (ver) visibles++;
      });
      var ordenadas = tarjetas.slice().sort(function (a, b) {
        if (estado.orden === "menor") return a.dataset.precio - b.dataset.precio;
        if (estado.orden === "mayor") return b.dataset.precio - a.dataset.precio;
        return a.dataset.pos - b.dataset.pos;
      });
      ordenadas.forEach(function (c) { grilla.appendChild(c); });
      botones.forEach(function (b) { b.classList.toggle("on", b.dataset.cat === estado.cat); });
      contador.textContent = visibles === 1 ? "1 joya" : visibles + " joyas";
      vacio.classList.toggle("oculto", visibles > 0);
      actualizarDireccion();
    }

    botones.forEach(function (b) {
      b.addEventListener("click", function () { estado.cat = b.dataset.cat; aplicar(); });
    });
    buscador.value = estado.q;
    buscador.addEventListener("input", function () { estado.q = buscador.value.trim(); aplicar(); });
    orden.value = estado.orden;
    orden.addEventListener("change", function () { estado.orden = orden.value; aplicar(); });
    if (params.get("buscar") !== null) buscador.focus();
    aplicar();
  }

  // ---- Ficha: compartir la joya ----
  var compartir = document.querySelector("[data-compartir]");
  if (compartir) {
    compartir.addEventListener("click", function () {
      var url = location.origin + location.pathname;
      var aviso = document.querySelector("[data-aviso]");
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { aviso.textContent = "Link copiado. ¡Pegalo donde quieras!"; });
      } else {
        aviso.textContent = url;
      }
    });
  }

  // ---- Vitrina estilo Apple: cada joya entra, crece, se endereza y sale según el desplazamiento ----
  var sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var vitrinas = Array.prototype.slice.call(document.querySelectorAll("[data-vitrina]"));
  if (vitrinas.length && !sinMovimiento) {
    var limitar = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var suave = function (v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };   // arranca y frena suave
    var pendiente = false;
    var moverVitrina = function () {
      pendiente = false;
      var alto = window.innerHeight;
      vitrinas.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.bottom < -alto || r.top > alto * 1.5) return;          // fuera de pantalla: no calcular
        // 0 cuando asoma abajo; 1 recién cuando ya está fija y se bajó ~0,6 pantalla más (ahí queda 100 % armada)
        var entrada = (alto - r.top) / (alto * 1.6);
        var salida = (alto - r.bottom) / (alto * 0.7);                 // se despide mientras entra la siguiente
        it.style.setProperty("--e", suave(limitar(entrada)).toFixed(4));
        it.style.setProperty("--t", suave(limitar((entrada - 0.78) / 0.3)).toFixed(4));
        it.style.setProperty("--s", limitar(salida).toFixed(4));
      });
    };
    var pedirCuadro = function () { if (!pendiente) { pendiente = true; requestAnimationFrame(moverVitrina); } };
    window.addEventListener("scroll", pedirCuadro, { passive: true });
    window.addEventListener("resize", pedirCuadro);
    moverVitrina();
  }

  // ---- Catálogo: crecimiento ligado al desplazamiento (si el navegador lo soporta) ----
  var conScroll = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()") && !sinMovimiento;
  if (conScroll) document.documentElement.classList.add("con-scroll");

  // ---- Aparición suave al bajar ----
  var aRevelar = document.querySelectorAll(".sechead, .card, .valores, .paso, .bloque, .historia, .ficha .info, .ficha .foto, .contacto .acciones, .editorial .fotos, .editorial .txt, .galeria img");
  if ("IntersectionObserver" in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); observador.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    aRevelar.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9 && window.scrollY < 50) return;   // lo de arriba se ve al instante
      if (conScroll && el.classList.contains("card") && el.closest(".grid")) return;                 // ya se mueve con el scroll
      el.classList.add("revelar");
      if (el.classList.contains("card")) el.style.transitionDelay = (i % 4) * 70 + "ms";   // en cascada
      observador.observe(el);
    });
  }

  // ---- Cabecera inteligente y botón volver arriba ----
  var cab = document.querySelector("header.cab");
  var arriba = document.querySelector("[data-arriba]");
  var ultimoY = window.scrollY;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    var bajando = y > ultimoY;
    if (Math.abs(y - ultimoY) > 6) {
      cab.classList.toggle("escondida", bajando && y > 220 && !(cajon && cajon.classList.contains("abierto")));
      ultimoY = y;
    }
    cab.classList.toggle("flotando", y > 40);
    arriba.classList.toggle("ver", y > 700);
  }, { passive: true });
  arriba.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // ---- Favoritos (se guardan en el navegador de la clienta) ----
  var CLAVE_FAV = "mimbise_favoritos";
  function leerFav() { try { return JSON.parse(localStorage.getItem(CLAVE_FAV)) || []; } catch (e) { return []; } }
  function guardarFav(lista) { try { localStorage.setItem(CLAVE_FAV, JSON.stringify(lista)); } catch (e) {} }
  function pintarFav() {
    var favs = leerFav();
    document.querySelectorAll("[data-fav]").forEach(function (b) {
      var on = favs.indexOf(b.dataset.fav) !== -1;
      b.classList.toggle("on", on);
      b.setAttribute("aria-label", on ? "Quitar de favoritos" : "Guardar en favoritos");
      var txt = b.querySelector("span");
      if (txt) txt.textContent = on ? "Guardada" : "Guardar";
    });
    var enWeb = Array.prototype.map.call(document.querySelectorAll("[data-favoritos] .card"), function (c) {
      return c.querySelector("[data-fav]").dataset.fav;
    });
    document.querySelectorAll("[data-fav-cuenta]").forEach(function (c) {
      c.textContent = favs.length; c.classList.toggle("oculto", favs.length === 0);
    });
    var pagina = document.querySelector("[data-favoritos]");
    if (pagina) {
      var visibles = 0;
      pagina.querySelectorAll(".card").forEach(function (c) {
        var es = favs.indexOf(c.querySelector("[data-fav]").dataset.fav) !== -1;
        c.classList.toggle("es-fav", es);
        if (es) { visibles++; c.classList.add("visible"); }
      });
      document.querySelector("[data-fav-vacio]").classList.toggle("oculto", visibles > 0);
      var vendidas = favs.filter(function (id) { return enWeb.indexOf(id) === -1; }).length;
      document.querySelector("[data-fav-nota]").classList.toggle("oculto", vendidas === 0);
    }
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-fav]");
    if (!b) return;
    ev.preventDefault();
    var favs = leerFav(), id = b.dataset.fav, i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    guardarFav(favs);
    b.classList.remove("latido"); void b.offsetWidth; b.classList.add("latido");
    pintarFav();
  });
  window.addEventListener("storage", pintarFav);   // si la abre en otra pestaña
  pintarFav();

  // ---- Carrusel de destacadas ----
  var car = document.querySelector("[data-carrusel]");
  if (car) {
    var flechas = document.querySelectorAll("[data-car]");
    function estadoFlechas() {
      var max = car.scrollWidth - car.clientWidth - 4;
      flechas[0].disabled = car.scrollLeft <= 4;
      flechas[1].disabled = car.scrollLeft >= max;
      document.querySelector(".flechas").style.visibility = car.scrollWidth > car.clientWidth + 4 ? "visible" : "hidden";
    }
    flechas.forEach(function (b) {
      b.addEventListener("click", function () { car.scrollBy({ left: b.dataset.car * car.clientWidth * 0.9, behavior: "smooth" }); });
    });
    car.addEventListener("scroll", estadoFlechas, { passive: true });
    window.addEventListener("resize", estadoFlechas);
    estadoFlechas();
  }

  // ---- Zoom de la foto y visor a pantalla completa ----
  var foto = document.querySelector("[data-zoom]");
  var visor = document.querySelector("[data-visor]");
  if (foto && visor) {
    var conRaton = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var img = foto.querySelector("img");
    if (conRaton) {
      foto.addEventListener("mouseenter", function () { foto.classList.add("zoom"); });
      foto.addEventListener("mouseleave", function () { foto.classList.remove("zoom"); img.style.transformOrigin = ""; });
      foto.addEventListener("mousemove", function (ev) {
        var r = foto.getBoundingClientRect();
        img.style.transformOrigin = ((ev.clientX - r.left) / r.width * 100) + "% " + ((ev.clientY - r.top) / r.height * 100) + "%";
      });
    }
    function cerrarVisor() { visor.classList.remove("abierto"); document.body.style.overflow = ""; }
    foto.addEventListener("click", function () { visor.classList.add("abierto"); document.body.style.overflow = "hidden"; });
    visor.addEventListener("click", function (ev) { if (ev.target === visor || ev.target.closest("[data-cerrar-visor]")) cerrarVisor(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") cerrarVisor(); });
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && cajon) { cajon.classList.remove("abierto"); document.body.style.overflow = ""; }
  });

  // ---- Barra "Lo quiero" fija en el celular (aparece cuando el botón principal quedó arriba) ----
  var barra = document.querySelector("[data-barra]");
  var acciones = document.querySelector("[data-acciones]");
  if (barra && acciones && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entradas) {
      var en = entradas[0];
      var mostrar = !en.isIntersecting && en.boundingClientRect.top < 0;
      barra.classList.toggle("ver", mostrar);
      document.body.classList.toggle("con-barra", mostrar);
    }).observe(acciones);
  }
})();
