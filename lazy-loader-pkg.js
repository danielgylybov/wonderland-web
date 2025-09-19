(() => {
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzScFAQ04UcDPY45STz97unF7AxtvgHTtjaLlbY85LKaSVCSGH-CFm3zU2eHTyXLuuG/exec';
  const CACHE_KEY = 'packages_json_v1';

  // 1) Skeleton UI
  function skeletonCard() {
    return `
      <div class="col-12 col-md-4 d-flex">
        <div class="sk-card packages-skeleton w-100">
          <div class="sk-line lg" style="width:60%"></div>
          <div class="sk-line" style="width:90%"></div>
          <div class="sk-line" style="width:85%"></div>
          <div class="sk-hr"></div>
          <div class="sk-line" style="width:95%"></div>
          <div class="sk-line xs" style="width:80%"></div>
          <div class="sk-line xs" style="width:70%"></div>
          <div class="sk-hr"></div>
          <div class="d-flex gap-2">
            <div class="sk-line" style="width:50%"></div>
            <div class="sk-line" style="width:50%"></div>
          </div>
        </div>
      </div>`;
  }
  function renderSkeleton(n=3) {
    const root = document.getElementById('packages-root');
    if (!root) return;
    root.classList.add('loading');
    root.innerHTML = `
      <h2 class="text-center mb-4" style="font-family:'Rosarium',serif;">Пакети</h2>
      <p class="text-center mb-5">Зареждаме предложенията…</p>
      <div class="row g-4">${Array.from({length:n}).map(skeletonCard).join('')}</div>
    `;
  }

  // 2) Error UI
  function renderError(errText='Не успяхме да заредим пакетите.') {
    const root = document.getElementById('packages-root');
    if (!root) return;
    root.classList.remove('loading');
    root.innerHTML = `
      <div class="pkg-error">
        <div class="mb-2">${errText}</div>
        <button class="btn btn-outline-light btn-sm" id="pkgRetryBtn">Опитай пак</button>
      </div>`;
    document.getElementById('pkgRetryBtn')?.addEventListener('click', () => {
      startLazyLoad(true);
    });
  }

  // 3) JSONP loader
  function loadPackagesFromSheetJSONP() {
    return new Promise((resolve, reject) => {
      const cb = 'sheetCb_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');

      window[cb] = (payload) => {
        try {
          resolve(payload);
        } finally {
          delete window[cb];
          script.remove();
        }
      };

      script.src = SHEET_URL + '?callback=' + cb;
      script.async = true;
      script.onerror = () => {
        delete window[cb];
        script.remove();
        reject(new Error('JSONP load failed'));
      };
      document.head.appendChild(script);
    });
  }

  // 4) Cache helpers
  function setCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({t:Date.now(), data})); } catch(_) {}
  }
  function getCache(maxAgeMs = 1000*60*15) { // 15 мин
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.t || !obj.data) return null;
      if (Date.now() - obj.t > maxAgeMs) return null;
      return obj.data;
    } catch(_) { return null; }
  }

  // 5) Основен ленив старт
  let started = false;
  async function startLazyLoad(force=false) {
    if (started && !force) return;
    started = true;

    const root = document.getElementById('packages-root');
    if (!root) return;

    // 5.1 Първо пробвай кеш → мигновен рендер
    const cached = getCache();
    if (cached && !force) {
      window.PACKAGES = cached;
      if (typeof window.renderPackagesSection === 'function') {
        window.renderPackagesSection();
        root.classList.remove('loading');
        root.classList.add('fade-in');
      }
      // тихо обновяване на заден план (без да блокираме) – по желание
      loadPackagesFromSheetJSONP().then(data => setCache(data)).catch(()=>{});
      return;
    }

    // 5.2 Показвай skeleton и зареди
    renderSkeleton(3);
    try {
      const data = await loadPackagesFromSheetJSONP();
      window.PACKAGES = data;
      setCache(data);
      if (typeof window.renderPackagesSection === 'function') {
        window.renderPackagesSection();
        root.classList.remove('loading');
        root.classList.add('fade-in');
      }
    } catch (err) {
      console.error(err);
      renderError('Възникна проблем при зареждането. Проверете връзката и опитайте пак.');
    }
  }

  // 6) Тригери: IntersectionObserver + префеч при hover/клик на навигация
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('packages-root');

    if (root && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries, obs) => {
        if (entries.some(e => e.isIntersecting)) {
          obs.disconnect();
          startLazyLoad();
        }
      }, { rootMargin: '300px 0px' });
      io.observe(root);
    }

    const prefetch = () => { if (!started) startLazyLoad(); };
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-scroll="#packages"], a[href="#packages"]');
      if (t) prefetch();
    });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-scroll="#packages"], a[href="#packages"]');
      if (t) prefetch();
    });

    // fallback: ако секцията е близо (до 2 екрана), стартирай на idle
    const nearViewport = () => {
      if (!root) return false;
      const rect = root.getBoundingClientRect();
      return rect.top < window.innerHeight * 2;
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => { if (nearViewport()) startLazyLoad(); }, { timeout: 2000 });
    } else {
      setTimeout(() => { if (nearViewport()) startLazyLoad(); }, 1500);
    }
  });

  // опционално: глобална кука, ако искаш ръчно
  window.triggerPackagesRender = () => startLazyLoad(true);
})();
