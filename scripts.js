/* ---------------------------------------------------------
   0) Малки помощници
--------------------------------------------------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const isOverlayOpen = () => document.body.classList.contains('no-scroll');

/* височина на fixed header */
function getHeaderH() {
  const header = $('.magic-header');
  return header ? Math.round(header.getBoundingClientRect().height) : 0;
}

/* Гладък скрол с корекция за header (fallback и за клик навигация) */
function scrollToWithOffset(target, extraOffset = 0) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const top = absoluteTop - getHeaderH() + extraOffset;

  window.scrollTo({ top, behavior: isOverlayOpen() ? 'auto' : 'smooth' });
}

/* debounce helper */
function debounce(fn, t) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), t); }; }

/* ---------------------------------------------------------
   1) Header: показване след като HERO излезе
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const header = $('#stickyHeader');
  const hero   = $('#hero');

  if (!header || !hero) { header?.classList.add('show-logo'); return; }

  // Показваме header САМО когато hero вече не е видим
  const io = new IntersectionObserver(
    ([entry]) => header.classList.toggle('show-logo', !entry.isIntersecting),
    { threshold: 0.15 } // докато поне 15% от hero е видим -> няма header
  );
  io.observe(hero);
});

/* ---------------------------------------------------------
   2) Click навигация (data-scroll и anchor линкове)
--------------------------------------------------------- */
document.addEventListener('click', (e) => {
  if (isOverlayOpen()) return;

  // data-scroll
  const btn = e.target.closest('[data-scroll]');
  if (btn) {
    e.preventDefault();
    const sel = btn.getAttribute('data-scroll');
    if (sel) scrollToWithOffset(sel);
    return;
  }

  // anchors
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href') !== '#') {
    e.preventDefault();
    scrollToWithOffset(a.getAttribute('href'));
  }
});

/* ---------------------------------------------------------
   3) Starfield
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const svg = $('#starfield');
  if (!svg) return;

  const variants = ['#star-shape', '#star-shape-rot', '#star-shape-slim'];
  const BASE_H = 100;
  const STAR_COUNT_BASE = 120;

  function clearStars(){ [...svg.querySelectorAll(':scope > g, :scope > use')].forEach(n => n.remove()); }

  function buildStars(){
    clearStars();
    const w = window.innerWidth, h = window.innerHeight;
    const vbH = BASE_H, vbW = BASE_H * (w / h);
    svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

    const areaFactor = vbW * vbH / (100 * 100);
    const STAR_COUNT = Math.round(STAR_COUNT_BASE * areaFactor);

    for (let i = 0; i < STAR_COUNT; i++) {
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      const ref = variants[Math.floor(Math.random() * variants.length)];
      use.setAttribute('href', ref);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', ref);
      use.setAttribute('class', 'star');

      const x = Math.random() * vbW, y = Math.random() * vbH;
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
   4) Intro Curtain – auto open, hide on end
--------------------------------------------------------- */
function getCurtain(){ return document.getElementById('intro-curtain'); }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openCurtain, { once: true });
  } else {
    requestAnimationFrame(openCurtain);
  }
})();

function curtainsClose(){
  return new Promise((resolve) => {
    const c = getCurtain();
    if (!c) return resolve();

    c.classList.remove('gone','open','closing');
    c.classList.add('prep-close');
    c.offsetHeight;
    c.classList.add('closing');

    let ended = 0;
    const onEnd = () => { if (++ended >= 2) { c.classList.remove('closing','prep-close'); resolve(); } };
    const left  = c.querySelector('.curtain-panel.left');
    const right = c.querySelector('.curtain-panel.right');
    if (!left || !right){ resolve(); return; }
    left.addEventListener('animationend', onEnd, { once:true });
    right.addEventListener('animationend', onEnd, { once:true });
  });
}

function curtainsOpen(){
  return new Promise((resolve) => {
    const c = getCurtain();
    if (!c) return resolve();
    c.classList.remove('gone','closing','prep-close');
    const onFade = (ev) => {
      if (ev.animationName === 'curtain-fade-out') {
        c.classList.add('gone'); c.classList.remove('open'); c.removeEventListener('animationend', onFade); resolve();
      }
    };
    c.addEventListener('animationend', onFade);
    c.classList.add('open');
  });
}

/* ---------------------------------------------------------
   5) Desktop „one-notch“ Snap
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const isDesktop    = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 992;
  const isTallEnough = window.innerHeight > 780;
  if (!isDesktop || !isTallEnough) return;

  const sections = $$('.snap').filter(s => s.id);
  if (!sections.length) return;

  const FUDGE = 40;
  const SCROLL_LOCK_MS = 650;
  const DELTA_THRESHOLD = 90;

  function currentIndex() {
    const y = window.scrollY + getHeaderH() + FUDGE;
    let best = 0, bestDist = Infinity;
    sections.forEach((s, i) => {
      const d = Math.abs(s.offsetTop - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  let idx = currentIndex();
  let animating = false;
  let wheelAcc = 0;
  let unlockTimer = 0;

  function moveTo(i) {
    if (i < 0 || i >= sections.length) return;
    animating = true;
    idx = i;
    scrollToWithOffset('#' + sections[i].id, 0);
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => { animating = false; }, SCROLL_LOCK_MS);
  }

  const onWheel = (e) => {
    if (isOverlayOpen()) return;
    if (animating) { e.preventDefault(); return; }
    wheelAcc += e.deltaY;

    const nearIdx = currentIndex();
    if (nearIdx !== idx) idx = nearIdx;

    if (wheelAcc > DELTA_THRESHOLD) {
      e.preventDefault();
      wheelAcc = 0;
      moveTo(Math.min(idx + 1, sections.length - 1));
    } else if (wheelAcc < -DELTA_THRESHOLD) {
      e.preventDefault();
      wheelAcc = 0;
      moveTo(Math.max(idx - 1, 0));
    }
  };
  window.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('scroll', () => {
    if (!animating && !isOverlayOpen()) idx = currentIndex();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const isTyping = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (isTyping || animating) return;

    const down = ['ArrowDown', 'PageDown', ' '];
    const up   = ['ArrowUp', 'PageUp'];

    if (down.includes(e.key)) {
      e.preventDefault();
      moveTo(Math.min(idx + 1, sections.length - 1));
    } else if (up.includes(e.key)) {
      e.preventDefault();
      moveTo(Math.max(idx - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault(); moveTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); moveTo(sections.length - 1);
    }
  });

  window.addEventListener('resize', debounce(() => { if (!isOverlayOpen()) idx = currentIndex(); }, 150));
});


/* ---------------------------------------------------------
   6) Scroll Indicator visibility: Hero only
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const indicator = document.getElementById('scroll-indicator');
  const hero = document.getElementById('hero') || document.querySelector('.hero.snap');
  if (!indicator || !hero) return;

  const io = new IntersectionObserver(([entry]) => {
    indicator.classList.toggle('hidden', !entry.isIntersecting);
  }, { threshold: 0, rootMargin: '-20% 0px -20% 0px' });

  io.observe(hero);
});

/* ---------------------------------------------------------
   7) Enquire → chose a package & scroll to form
--------------------------------------------------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-enquire-package]');
  if (!btn) return;

  const name  = btn.getAttribute('data-enquire-package')?.trim() || 'Пакет';
  const badge = document.getElementById('selectedPackageBadge');
  const valueEl = badge?.querySelector('.value');
  const field = document.getElementById('packageField');

  if (badge && valueEl && field) {
    valueEl.textContent = name;
    field.value = name;
    badge.classList.remove('d-none');
    badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = '';
  }
  scrollToWithOffset('#contact');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#selectedPackageBadge .clear')) return;
  const badge = document.getElementById('selectedPackageBadge');
  const field = document.getElementById('packageField');
  const label = document.getElementById('selectedPackageLabel');
  if (badge) badge.classList.add('d-none');
  if (field) field.value = '';
  if (label) label.classList.add('d-none');
});

document.addEventListener('DOMContentLoaded', () => {
  const date = document.getElementById('dateField');
  if (!date) return;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  date.min = `${yyyy}-${mm}-${dd}`;
});

/* ---------------------------------------------------------
   8) iOS Safari scroll restore guard
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  window.history.scrollRestoration = 'manual';
  window.addEventListener('pageshow', (e)=>{ if (e.persisted) window.scrollTo(0,0); }, { passive:true });
});
