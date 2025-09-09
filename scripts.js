/* ---------------------------------------------------------
   0) Малки помощници
--------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// най-горе в scripts.js
const isOverlayOpen = () => document.body.classList.contains('no-scroll');

/* височината на fixed хедъра (ако е видим) */
function getHeaderH() {
  const header = $('.magic-header');
  return header ? Math.round(header.getBoundingClientRect().height) : 0;
}

/* Гладко превъртане с корекция за header (твоята „ключова“ функция) */
function scrollToWithOffset(target, extraOffset = 0) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  const header = document.querySelector('.magic-header');
  const headerH = header ? header.getBoundingClientRect().height : 0;

  const rect = el.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;

  // по твоя формула – малко „повдигане“ (−headerH + 40px)
  const top = absoluteTop - (headerH - 40) + extraOffset;

  window.scrollTo({ top, behavior: isOverlayOpen() ? 'auto' : 'smooth' });
}

/* debounce helper */
function debounce(fn, t) {
  let h;
  return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), t); };
}

/* ---------------------------------------------------------
   1) Header: показване след като hero излезе
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const header = $('#stickyHeader');
  const heroTarget =
    $('.hero-logo-text') ||
    $('.hero .logo-svg') ||
    $('.hero img, .hero svg') ||
    $('.hero');

  if (!header || !heroTarget) {
    header?.classList.add('show-logo');
    return;
  }

  const io = new IntersectionObserver(
    ([entry]) => header.classList.toggle('show-logo', !entry.isIntersecting),
    { threshold: 0, rootMargin: '-56px 0px 0px 0px' }
  );
  io.observe(heroTarget);
});

/* ---------------------------------------------------------
   2) Click навигация (бутони + линкове) – ползва scrollToWithOffset
--------------------------------------------------------- */
document.addEventListener('click', (e) => {
  if (isOverlayOpen()) return;
  const btn = e.target.closest('[data-scroll]');
  if (btn) {
    e.preventDefault();
    const sel = btn.getAttribute('data-scroll');
    scrollToWithOffset(sel);
    return;
  }

  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href') !== '#') {
    e.preventDefault();
    const id = a.getAttribute('href');
    scrollToWithOffset(id);
  }
});

/* ---------------------------------------------------------
   3) Starfield (както си беше)
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const svg = $('#starfield');
  if (!svg) return;

  const variants = ['#star-shape', '#star-shape-rot', '#star-shape-slim'];
  const BASE_H = 100;
  const STAR_COUNT_BASE = 120;

  function clearStars() {
    [...svg.querySelectorAll(':scope > g, :scope > use')].forEach(n => n.remove());
  }

  function buildStars() {
    clearStars();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const vbH = BASE_H;
    const vbW = BASE_H * (w / h);
    svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

    const areaFactor = vbW * vbH / (100 * 100);
    const STAR_COUNT = Math.round(STAR_COUNT_BASE * areaFactor);

    for (let i = 0; i < STAR_COUNT; i++) {
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      const ref = variants[Math.floor(Math.random() * variants.length)];
      use.setAttribute('href', ref);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', ref);
      use.setAttribute('class', 'star');

      const x = Math.random() * vbW;
      const y = Math.random() * vbH;
      const size = (Math.random() * 1.4 + 0.8).toFixed(2);
      use.setAttribute('x', x.toFixed(2));
      use.setAttribute('y', y.toFixed(2));
      use.setAttribute('width', size);
      use.setAttribute('height', size);

      use.style.setProperty('--pulse', (0.95 + Math.random() * 0.1).toFixed(2));
      use.style.setProperty('--twinkle', (4 + Math.random() * 4).toFixed(1) + 's');
      use.style.setProperty('--drift', (90 + Math.random() * 60).toFixed(0) + 's');
      use.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `rotate(${Math.floor(Math.random() * 360)} ${x} ${y})`);
      g.appendChild(use);
      svg.appendChild(g);
    }
  }

  buildStars();
  window.addEventListener('resize', debounce(buildStars, 150));
});

/* ---------------------------------------------------------
   4) Intro Curtain – auto open, remove on end
--------------------------------------------------------- */
/* ===== Reusable Intro Curtain helpers ===== */
function getCurtain(){ return document.getElementById('intro-curtain'); }

/* Първоначално поведение при зареждане: отваря се и се “скрива”, без remove() */
/* Първоначално поведение при зареждане: отвори завесите възможно най-рано */
(function initCurtainAuto() {
  const c = getCurtain();
  if (!c) return;

  const openCurtain = () => {
    c.offsetWidth;
    requestAnimationFrame(() => c.classList.add('open'));

    const SAFETY = 1800;
    const safetyTimer = setTimeout(() => {
      c.classList.add('gone');
      c.classList.remove('open', 'closing', 'prep-close');
    }, SAFETY);

    c.addEventListener('animationend', (ev) => {
      if (ev.animationName === 'curtain-fade-out') {
        clearTimeout(safetyTimer);
        c.classList.add('gone');
        c.classList.remove('open', 'closing', 'prep-close');
      }
    });
  };

  // стартирай НАЙ-РАНО – без да чакаш images/fonts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openCurtain, { once: true });
  } else {
    requestAnimationFrame(openCurtain);
  }
})();


/* Затвори завесите към центъра (за показване на модал) → Promise */
function curtainsClose(){
  return new Promise((resolve) => {
    const c = getCurtain();
    if (!c) return resolve();

    // покажи, подготви паната “отворени”, после анимирай към центъра
    c.classList.remove('gone','open','closing');
    c.classList.add('prep-close');

    c.offsetHeight;

    c.classList.add('closing');

    let ended = 0;
    const onEnd = () => {
      ended++;
      if (ended >= 2) {                 // чакаме ляво + дясно пано
        c.classList.remove('closing','prep-close');
        resolve();
      }
    };
    const left  = c.querySelector('.curtain-panel.left');
    const right = c.querySelector('.curtain-panel.right');
    if (!left || !right){ resolve(); return; }

    left.addEventListener('animationend', onEnd, { once:true });
    right.addEventListener('animationend', onEnd, { once:true });
  });
}

/* Отвори завесите (както интрото) и после ги скрий → Promise */
function curtainsOpen(){
  return new Promise((resolve) => {
    const c = getCurtain();
    if (!c) return resolve();

    c.classList.remove('gone','closing','prep-close');

    const onFade = (ev) => {
      if (ev.animationName === 'curtain-fade-out') {
        c.classList.add('gone');   // скрий
        c.classList.remove('open');
        c.removeEventListener('animationend', onFade);
        resolve();
      }
    };
    c.addEventListener('animationend', onFade);
    // тригерни отварянето (паната се разтварят + fade-out)
    c.classList.add('open');
  });
}

/* ---------------------------------------------------------
   5) Desktop full-page snap (wheel = 1 секция) – ползва scrollToWithOffset
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const isDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 992;
  if (!isDesktop) return;

  const sections = $$('.snap');
  if (!sections.length) return;

  /* --- Snap helpers --- */
  const SNAP_FUDGE = 40;          // съгласувано със scrollToWithOffset (−headerH + 40)
  const BOTTOM_BUFFER = 120;      // доп. буфер НАДОЛУ само за високи секции

  function sectionEdgeState(section, tol = 24) {
    const h = getHeaderH();
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    const vTop = window.scrollY + h;                // видим връх (с header)
    const vBottom = vTop + window.innerHeight;

    // Секцията е „висока“, ако е по-висока от видимото (без header и fudge)
    const isTall = section.offsetHeight > (window.innerHeight - SNAP_FUDGE);

    // "Върхът" е при top + SNAP_FUDGE (как подравняваме секцията)
    const atTop    = vTop <= top + SNAP_FUDGE + tol;

    // Долен ръб: изискваме да „влезеш“ още BOTTOM_BUFFER, но само ако е висока
    const bottomThreshold = bottom + (isTall ? BOTTOM_BUFFER : 0) - tol;
    const atBottom = vBottom >= bottomThreshold;

    return { atTop, atBottom, top, bottom, vTop, vBottom, isTall };
  }

  /* Индекс на текущата секция – стабилно и предвидимо */
  let index = 0;
  function recalcIndex() {
    const y = window.scrollY + getHeaderH() + SNAP_FUDGE; // линията на „подравняване“
    let current = -1;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const top = s.offsetTop;
      const bottom = top + s.offsetHeight;
      if (y >= top && y < bottom) { current = i; break; }
    }
    if (current === -1) {
      // fallback: най-близкия top
      let best = 0, bestDist = Infinity;
      sections.forEach((s, i) => {
        const d = Math.abs(s.offsetTop - y);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      current = best;
    }
    index = current;
  }
  recalcIndex();

  let animating = false, unlockTimer = 0;
  function goTo(i) {
    if (i < 0 || i >= sections.length) return;
    animating = true;
    const sel = `#${sections[i].id}`;
    scrollToWithOffset(sel, 0);
    index = i;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => (animating = false), 700);
  }

  // preventDefault САМО когато наистина правим SNAP
  const onWheel = (e) => {
    if (isOverlayOpen() || animating) return;

    const s = sections[index];
    const { atTop, atBottom } = sectionEdgeState(s);

    const dy = e.deltaY;
    if (dy > 0 && atBottom) {
      e.preventDefault();
      goTo(index + 1);
    } else if (dy < 0 && atTop) {
      e.preventDefault();
      goTo(index - 1);
    }
    // иначе – естествен скрол вътре в секцията
  };

  window.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const isTyping = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (isTyping || animating) return;

    const s = sections[index];
    const { atTop, atBottom } = sectionEdgeState(s);

    const downKeys = ['ArrowDown', 'PageDown', ' '];
    const upKeys   = ['ArrowUp', 'PageUp'];

    if (downKeys.includes(e.key)) {
      if (atBottom) { e.preventDefault(); goTo(index + 1); }
    } else if (upKeys.includes(e.key)) {
      if (atTop) { e.preventDefault(); goTo(index - 1); }
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(sections.length - 1);
    }
  });

  const onScrollPassive = () => { if (!animating && !isOverlayOpen()) recalcIndex(); };
  window.addEventListener('scroll', onScrollPassive, { passive: true });

  window.addEventListener('resize', () => {
    if (isOverlayOpen()) return;
    recalcIndex();
    goTo(index);
  });
});

// Scroll Indicator visibility: показвай само на Hero
document.addEventListener('DOMContentLoaded', () => {
  const indicator = document.getElementById('scroll-indicator');
  const hero = document.getElementById('hero') || document.querySelector('.hero.snap');
  if (!indicator || !hero) return;

  const io = new IntersectionObserver(([entry]) => {
    // показвай, ако hero е видим поне частично
    indicator.classList.toggle('hidden', !entry.isIntersecting);
  }, { threshold: 0, rootMargin: '-20% 0px -20% 0px' });

  io.observe(hero);
});

/* ==== Enquire → избери пакет + скрол към формата ==== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-enquire-package]');
  if (!btn) return;

  const name = btn.getAttribute('data-enquire-package')?.trim() || 'Пакет';
  const badge = document.getElementById('selectedPackageBadge');
  const valueEl = badge?.querySelector('.value');
  const field = document.getElementById('packageField');

  if (badge && valueEl && field) {
    valueEl.textContent = name;
    field.value = name;
    badge.classList.remove('d-none');
    // лека „пулсация“ при нов избор
    badge.style.animation = 'none';
    // force reflow
    void badge.offsetWidth;
    badge.style.animation = '';
  }

  // скрол към формата (ползваме твоя общ скрол)
  scrollToWithOffset('#contact');
});

/* Изчистване на избрания пакет */
document.addEventListener('click', (e) => {
  if (!e.target.closest('#selectedPackageBadge .clear')) return;
  const badge = document.getElementById('selectedPackageBadge');
  const field = document.getElementById('packageField');
  if (badge) badge.classList.add('d-none');
  if (field) field.value = '';
});

/* Минимална дата = днес (локално време) */
document.addEventListener('DOMContentLoaded', () => {
  const date = document.getElementById('dateField');
  if (!date) return;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  date.min = `${yyyy}-${mm}-${dd}`;
});
