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
/* Intro Curtain – auto open, then hide (не remove) */
/* ===== Reusable Intro Curtain helpers ===== */
function getCurtain(){ return document.getElementById('intro-curtain'); }

/* Първоначално поведение при зареждане: отваря се и се “скрива”, без remove() */
window.addEventListener('load', () => {
  const c = getCurtain();
  if (!c) return;

  // първо отваряне
  setTimeout(() => c.classList.add('open'), 250);

  // след fade-out → скрий и махни .open (готови за повторна употреба)
  c.addEventListener('animationend', (ev) => {
    if (ev.animationName === 'curtain-fade-out') {
      c.classList.add('gone');
      c.classList.remove('open');
      c.classList.remove('closing');
      c.classList.remove('prep-close');
    }
  });
});

/* Затвори завесите към центъра (за показване на модал) → Promise */
function curtainsClose(){
  return new Promise((resolve) => {
    const c = getCurtain();
    if (!c) return resolve();

    // покажи, подготви паната “отворени”, после анимирай към центъра
    c.classList.remove('gone','open','closing');
    c.classList.add('prep-close');

    // force reflow, за да сработят анимациите надеждно
    // eslint-disable-next-line no-unused-expressions
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

  const headerH = () => getHeaderH();

  let index = 0;
  function recalcIndex() {
    const y = window.scrollY + headerH() + 1;
    let best = 0, bestDist = Infinity;
    sections.forEach((s, i) => {
      const top = s.offsetTop;
      const d = Math.abs(top - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    index = best;
  }
  recalcIndex();

  let animating = false, unlockTimer = 0;
  function goTo(i) {
    if (i < 0 || i >= sections.length) return;
    animating = true;

    // За първата секция не вадим header (както искаше логиката)
    const sel = `#${sections[i].id}`;
    if (i === 0) {
      // леко „повдигане“, за да изглежда идентично с клик-скрола
      scrollToWithOffset(sel, 0);
    } else {
      scrollToWithOffset(sel, 0);
    }

    index = i;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => (animating = false), 700);
  }

  let accum = 0;
  const THRESHOLD = 60;

  const onWheel = (e) => {
    if (isOverlayOpen()) return;
    e.preventDefault();
    if (animating) return;

    const dy = Math.max(-120, Math.min(120, e.deltaY));
    accum += dy;

    if (accum > THRESHOLD) {
      accum = 0; goTo(index + 1);
    } else if (accum < -THRESHOLD) {
      accum = 0; goTo(index - 1);
    }
  };

  window.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (isOverlayOpen()) return;
    if (animating) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault(); goTo(index + 1);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault(); goTo(index - 1);
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


