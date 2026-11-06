/* =====================================================================
   LANDING DE OPTIMIZACIÓN DE RUTAS — animaciones e interacciones
   Sin dependencias. Todo degrada con elegancia si no hay JS.
   ===================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------
     1. Imágenes: si el archivo existe, tapa el mockup vectorial
     --------------------------------------------------------------- */
  $$('.panel__img').forEach(function (img) {
    var box = img.closest('.panel');
    if (img.complete && img.naturalWidth > 0) mark();
    img.addEventListener('load', mark);
    img.addEventListener('error', function () { img.remove(); });
    function mark() {
      img.classList.add('is-loaded');
      if (box) box.classList.add('has-img');
    }
  });

  /* ---------------------------------------------------------------
     2. Cabecera al hacer scroll + barra de progreso + botón subir
     --------------------------------------------------------------- */
  var nav = $('#nav');
  var progress = $('#progress');
  var toTop = $('#toTop');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset;
    if (nav) nav.classList.toggle('is-stuck', y > 12);
    if (toTop) toTop.classList.toggle('is-on', y > 900);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------------
     3. Menú móvil
     --------------------------------------------------------------- */
  var burger = $('#burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    $$('.nav__menu a, .nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------------------------------------------------------
     4. Titulares palabra a palabra (se revelan desde su máscara)
     Solo con texto plano y sin `prefers-reduced-motion`.
     --------------------------------------------------------------- */
  $$('[data-split]').forEach(function (el) {
    if (el.children.length || reduce) return;
    var words = el.textContent.trim().split(/\s+/);
    if (words.length < 2) return;
    var frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      outer.className = 'w';
      outer.style.setProperty('--wi', i);
      var inner = document.createElement('span');
      inner.textContent = w;
      outer.appendChild(inner);
      frag.appendChild(outer);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(frag);
  });

  /* ---------------------------------------------------------------
     4b. Escalonado: índice de cada hijo para que entren en cadena
     --------------------------------------------------------------- */
  $$('[data-stagger]').forEach(function (el) {
    Array.prototype.slice.call(el.children).forEach(function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  /* ---------------------------------------------------------------
     4c. Parallax: desplazamiento ligero sobre el scroll.
     Un solo rAF, y solo `transform` (no altera el layout).
     --------------------------------------------------------------- */
  var pxEls = $$('[data-parallax]');
  if (pxEls.length && !reduce) {
    var pxPending = false;
    function pxRun() {
      var vh = window.innerHeight || 1;
      for (var i = 0; i < pxEls.length; i++) {
        var el = pxEls[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) continue;      // fuera de pantalla
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        var d = (r.top + r.height / 2 - vh / 2) / vh;         // -1 … 1
        if (d < -1) d = -1; else if (d > 1) d = 1;
        el.style.transform = 'translate3d(0,' + (d * speed * 120).toFixed(2) + 'px,0)';
      }
      pxPending = false;
    }
    var pxRequest = function () {
      if (pxPending) return;
      pxPending = true;
      requestAnimationFrame(pxRun);
    };
    window.addEventListener('scroll', pxRequest, { passive: true });
    window.addEventListener('resize', pxRequest, { passive: true });
    pxRun();
  }

  /* ---------------------------------------------------------------
     5. Aparición al hacer scroll
     --------------------------------------------------------------- */
  var revealables = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduce) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
     6. Contadores animados (franja manifiesto)
     --------------------------------------------------------------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count || '0');
    var suffix = el.dataset.suffix || '';
    var dur = 1500;
    var start = null;

    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.classList.add('is-done');             // rebote al terminar
    }
    requestAnimationFrame(frame);
  }

  var counters = $$('.manifest__num');
  if (!('IntersectionObserver' in window)) {
    counters.forEach(countUp);
  } else {
    var ioC = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); ioC.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      if (reduce) el.textContent = (el.dataset.count || '0') + (el.dataset.suffix || '');
      else ioC.observe(el);
    });
  }

  /* ---------------------------------------------------------------
     7. Historia: paso activo según el scroll + escenas
     --------------------------------------------------------------- */
  var steps = $$('.step');
  var scenes = $$('.stage-scene');
  if (steps.length && scenes.length) {
    var storyTick = false;
    var storyPick = function () {
      storyTick = false;
      var line = innerHeight * 0.5;            // línea de activación (centro del viewport)
      var best = 0, bestD = Infinity;
      for (var k = 0; k < steps.length; k++) {
        var r = steps[k].getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - line);
        if (d < bestD) { bestD = d; best = k; }
      }
      for (var j = 0; j < steps.length; j++) steps[j].classList.toggle('is-active', j === best);
      var target = steps[best].getAttribute('data-step');
      for (var m = 0; m < scenes.length; m++) {
        scenes[m].classList.toggle('is-on', scenes[m].getAttribute('data-scene') === target);
      }
    };
    var storyOnScroll = function () {
      if (!storyTick) { storyTick = true; requestAnimationFrame(storyPick); }
    };
    addEventListener('scroll', storyOnScroll, { passive: true });
    addEventListener('resize', storyOnScroll, { passive: true });
    storyPick();
  }

  /* ---------------------------------------------------------------
     8. Matriz decorativa del paso 2
     --------------------------------------------------------------- */
  var mx = $('#mx');
  if (mx) {
    var html = '';
    for (var i = 0; i < 56; i++) {
      var v = 0;
      if (i % 7 === 0) v = 1;
      else if (i % 5 === 0) v = 2;
      html += '<i data-v="' + v + '" style="--i:' + i + '"></i>';
    }
    mx.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     9. Matriz de distancias (celda "motor")
     --------------------------------------------------------------- */
  var mxnum = $('#mxnum');
  if (mxnum) {
    var seed = [0, 14, 22, 9, 31, 18, 12, 0, 27, 16, 8, 24,
                7, 19, 0, 13, 26, 11, 29, 10, 15, 0, 21, 6,
                17, 23, 9, 30, 0, 14, 5, 25, 12, 18, 9, 0];
    var out = '';
    for (var k = 0; k < seed.length; k++) {
      var val = seed[k];
      var cls = val === 0 ? 'is-lo' : (val >= 29 ? 'is-hi' : '');
      out += '<span class="' + cls + '">' + (val === 0 ? '·' : val) + '</span>';
    }
    mxnum.innerHTML = out;
  }

  /* ---------------------------------------------------------------
     10. FAQ: solo una abierta a la vez
     --------------------------------------------------------------- */
  var faqItems = $$('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* ---------------------------------------------------------------
     11. Formulario de contacto
     --------------------------------------------------------------- */
  var form = $('#form-contacto');
  if (form) {
    // Con FORM_ACTION vacío en el .env no hay destino real: no se envía nada
    // y se muestra el mensaje de confirmación (así se ve el diseño sin
    // backend). Con destino, el navegador envía el formulario con normalidad.
    var destino = (form.getAttribute('action') || '').trim();
    if (!destino) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = $('#email', form);
        if (!input.value || input.value.indexOf('@') < 0) {
          input.focus();
          input.style.color = '#ff6b6b';
          setTimeout(function () { input.style.color = ''; }, 1200);
          return;
        }
        var ok = $('#form-ok');
        if (ok) ok.hidden = false;
        form.reset();
      });
    }
  }

})();
