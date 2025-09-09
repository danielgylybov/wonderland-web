/* packages.js – лениви пакети: без авто-рендер и без мрежови заявки */

/* --- мини селектори --- */
const $_ = (s, r = document) => r.querySelector(s);

/* --- динамични текстове/валута (четат от window.PACKAGES в момента на ползване) --- */
function getCopy() {
  const p = window.PACKAGES || {};
  return {
    viewMore: "Виж още",
    chooseText: "Избери пакет",
    pricePrefix: p.pricePrefix || "от"
  };
}
function getCurrency() {
  return (window.PACKAGES && window.PACKAGES.currency) || "лв";
}

/* --- Escape/форматиране --- */
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
           .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
           .replace(/'/g, "&#39;");

const fmtPrice = (num) => Number(num || 0).toLocaleString("bg-BG");
function priceText(base, mult = 1) {
  const COPY = getCopy();
  const CURRENCY = getCurrency();
  const val = Math.round((Number(base)||0) * (Number(mult)||1));
  return `${esc(COPY.pricePrefix)} ${fmtPrice(val)} ${esc(CURRENCY)}`;
}

/* --- (По желание) Google Drive мини-хелпъри за карусела --- */
const PACKAGES_PARENT_FOLDER = '144a10jYonm6dXeMWZV7GLSRCkszUggcP'; // главна папка с под-папки "basic", "signature" и т.н.
const driveThumb = (id, w = 1600) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const _driveCache = new Map();
async function driveList(q, pageSize = 12) {
  if (!window.DRIVE_API_KEY) return { files: [] };
  const key = `q:${q}|p:${pageSize}`;
  if (_driveCache.has(key)) return _driveCache.get(key);
  const params = new URLSearchParams({
    q, key: window.DRIVE_API_KEY, pageSize: String(pageSize),
    fields: 'files(id,name,mimeType),nextPageToken', orderBy: 'name'
  });
  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const res = await fetch(url);
  const data = res.ok ? await res.json() : { files: [] };
  _driveCache.set(key, data);
  return data;
}
const escapeDriveName = (name='') => name.replace(/'/g, "\\'");
async function findSubfolderIdByName(folderName) {
  const q = [
    `name = '${escapeDriveName(folderName)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${PACKAGES_PARENT_FOLDER}' in parents`,
    `trashed = false`,
  ].join(' and ');
  const data = await driveList(q, 5);
  return data.files?.[0]?.id ?? null;
}
async function listImagesInFolder(folderId, limit = 8) {
  if (!folderId) return [];
  const q = [
    `'${folderId}' in parents`,
    `mimeType contains 'image/'`,
    `trashed = false`,
  ].join(' and ');
  const data = await driveList(q, limit);
  return (data.files || []).slice(0, limit);
}

/* --- Scroll lock и завеси (fallback ако липсват) --- */
const _scrollLock = { y: 0, pad: 0, on: false, prevRest: null };
function lockScroll() {
  if (_scrollLock.on) return;
  _scrollLock.y = window.scrollY || document.documentElement.scrollTop || 0;
  _scrollLock.prevRest = history.scrollRestoration;
  try { history.scrollRestoration = 'manual'; } catch(_) {}
  const sb = window.innerWidth - document.documentElement.clientWidth;
  if (sb > 0) { _scrollLock.pad = sb; document.body.style.paddingRight = sb + 'px'; }
  document.body.style.top = `-${_scrollLock.y}px`;
  document.body.classList.add('no-scroll');
  _scrollLock.on = true;
}
function unlockScroll() {
  if (!_scrollLock.on) return;
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  if (_scrollLock.pad) { document.body.style.paddingRight = ''; _scrollLock.pad = 0; }
  window.scrollTo(0, _scrollLock.y);
  html.style.scrollBehavior = prev || '';
  try { history.scrollRestoration = _scrollLock.prevRest; } catch(_) {}
  _scrollLock.on = false;
}

/* --- Карта --- */
function cardHTML(pkg) {
  const COPY = getCopy();
  const id = (pkg.name || "").toLowerCase().trim().replace(/\s+/g, "-");
  const feats = Array.isArray(pkg.features) ? pkg.features.slice(0, 3) : [];
  const firstMult = pkg.tiers?.[0]?.multiplier ?? 1;
  const highlight = pkg.featured ? ' style="border: 2px solid rgba(212,175,55,.35)"' : '';
  return `
  <div class="col-12 col-md-4 d-flex">
    <div class="pack-card p-4 w-100"${highlight}>
      <h3 class="mb-2" style="font-family:'Rosarium',serif;">${esc(pkg.name)}</h3>
      <p class="opacity-75 mb-3">${esc(pkg.desc || "")}</p>
      <div class="price mb-3">${priceText(pkg.basePrice, firstMult)}</div>
      ${feats.length ? `<ul class="mb-4 opacity-90">${feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      <div class="d-flex gap-2 mt-auto">
        <button class="btn btn-outline-light w-50" type="button" data-view="${esc(id)}">${esc(COPY.viewMore)}</button>
        <button class="btn btn-primary w-50" type="button" data-choose="${esc(id)}">${esc(COPY.chooseText)}</button>
      </div>
    </div>
  </div>`;
}

/* --- Рендер секция (вика се само когато данните са налични) --- */
function renderPackagesSection() {
  const m = window.PACKAGES || {};
  const root = document.getElementById("packages-root");
  if (!root) return;
  const list = Array.isArray(m.packages) ? m.packages : [];
  const cards = list.map(cardHTML).join("");
  root.innerHTML = `
    <h2 class="text-center mb-4" style="font-family:'Rosarium',serif;">${esc(m.title || "Пакети")}</h2>
    <p class="text-center mb-5">${esc(m.subtitle || "")}</p>
    <div class="row g-4">
      ${cards || `<div class="col-12"><div class="text-center opacity-75">В момента няма активни пакети.</div></div>`}
    </div>
  `;
}

/* --- Оувърлей (пълно съдържание и същата подредба) --- */
function renderPackageOverlay(model) {
  const COPY = getCopy();
  const overlay = $_('#package-overlay');
  if (!overlay) return;

  const carouselId = `pkgCarousel-${Date.now()}`;

  overlay.innerHTML = `
    <div class="pkg-sheet">
      <div class="pkg-header">
        <div>
          <div class="pkg-title">${esc(model.name)}</div>
          <div class="opacity-75">${esc(model.desc || '')}</div>
        </div>
        <button class="pkg-close" aria-label="Затвори">×</button>
      </div>

      <div class="pkg-body">
        <div class="pkg-grid">
          <div class="pkg-card">
            <div class="pkg-label mb-2">Какво включва:</div>
            <ul class="mb-0">${(model.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          </div>

          <div class="pkg-card">
            <div class="pkg-label mb-1">Брой гости:</div>
            ${Array.isArray(model.tiers) && model.tiers.length ? `
              <select class="form-select pkg-select" id="pkgTier">
                ${model.tiers.map((t,i)=>`<option value="${i}">${esc(t.label)}</option>`).join('')}
              </select>
            ` : `<div class="opacity-75">Един размер</div>`}

            <div class="d-flex align-items-center justify-content-between mt-3">
              <div class="pkg-label">Ориентировъчна цена</div>
              <div class="pkg-price" id="pkgPrice">${priceText(model.basePrice, model.tiers?.[0]?.multiplier ?? 1)}</div>
            </div>
          </div>
        </div>

        <div class="pkg-card">
          <div id="pkgCarouselWrap">
            <div class="text-center opacity-75" id="pkgLoading">Зареждане…</div>
          </div>
        </div>

        ${ Array.isArray(model.addOns) && model.addOns.length ? `
          <div class="pkg-card">
            <div class="pkg-label mb-2">Допълнително:</div>
            <ul class="mb-0">
              ${model.addOns.map(a => `<li>${esc(a)}</li>`).join("")}
            </ul>
          </div>
        ` : '' }
      </div>

      <div class="pkg-footer">
        <button class="btn btn-outline-light" id="pkgBack">Назад</button>
        <button class="btn btn-primary" id="pkgChoose">${esc(COPY.chooseText)}</button>
      </div>
    </div>
  `;

  /* --- Плавно показване с „завеси“ и lockScroll --- */
  (async () => {
    try { if (typeof curtainsClose === 'function') await curtainsClose(); } catch(_) {}
    try { lockScroll(); } catch(_) {}
    overlay.classList.remove('d-none');
    requestAnimationFrame(() => overlay.classList.add('show'));
  })();

  /* --- Цена по tier --- */
  const sel = $_('#pkgTier', overlay);
  const priceEl = $_('#pkgPrice', overlay);
  const recalc = () => {
    const idx = Number(sel?.value || 0);
    const mult = model.tiers?.[idx]?.multiplier ?? 1;
    priceEl.textContent = priceText(model.basePrice, mult);
  };
  if (sel) sel.addEventListener('change', recalc, { passive: true });

  /* --- Карусел: gallery → galleryIds → Drive по име --- */
  (async () => {
    const wrap = $_('#pkgCarouselWrap', overlay);
    const loading = $_('#pkgLoading', overlay);
    try {
      let files = [];

      if (Array.isArray(model.gallery) && model.gallery.length) {
        files = model.gallery.map(src => ({ type: 'url', src }));
      } else if (Array.isArray(model.galleryIds) && model.galleryIds.length) {
        files = model.galleryIds.map(id => ({ type: 'drive', id }));
      } else {
        // fallback: под-папка по име
        const folderName = (model.name || '').toLowerCase().trim();
        const subId = await findSubfolderIdByName(folderName);
        if (subId) {
          const imgs = await listImagesInFolder(subId, 8);
          files = imgs.map(f => ({ type: 'drive', id: f.id }));
        }
      }

      loading?.remove();

      if (!files.length) {
        wrap.innerHTML = `<div class="opacity-75">Няма изображения за този пакет.</div>`;
        return;
      }

      const slides = files.slice(0, 8).map((f, i) => `
        <div class="carousel-item ${i===0?'active':''}">
          <img class="d-block w-100"
               src="${f.type==='url' ? esc(f.src) : driveThumb(f.id, 1600)}"
               alt=""
               loading="${i===0?'eager':'lazy'}" decoding="async">
        </div>
      `).join('');

      const indicators = files.length > 1 ? `
        <div class="carousel-indicators">
          ${files.map((_, i) => `
            <button type="button"
              data-bs-target="#${carouselId}"
              data-bs-slide-to="${i}"
              ${i===0?'class="active" aria-current="true"':''}
              aria-label="Слайд ${i+1}">
            </button>
          `).join('')}
        </div>` : '';

      const controls = files.length > 1 ? `
        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" aria-label="Предишен">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next" aria-label="Следващ">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
        </button>` : '';

      wrap.innerHTML = `
        <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000" data-bs-pause="hover" data-bs-touch="true">
          ${indicators}
          <div class="carousel-inner">${slides}</div>
          ${controls}
        </div>
      `;

      if (window.bootstrap?.Carousel) {
        new bootstrap.Carousel(document.getElementById(carouselId), { interval: 3000, pause: 'hover', touch: true });
      }
    } catch (err) {
      loading?.remove();
      wrap.innerHTML = `<div class="opacity-75">Каруселът не можа да се зареди.</div>`;
      console.error('[Package carousel]', err);
    }
  })();

  const closeOverlay = async () => {
    overlay.classList.remove('show');
    await new Promise(r => setTimeout(r, 280));
    overlay.classList.add('d-none');
    try { unlockScroll(); } catch(_) {}
    try { if (typeof curtainsOpen === 'function') await curtainsOpen(); } catch(_) {}
  };

  $_('.pkg-close', overlay)?.addEventListener('click', closeOverlay);
  $_('#pkgBack', overlay)?.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

  $_('#pkgChoose', overlay)?.addEventListener('click', async () => {
    const idx    = Number($_('#pkgTier', overlay)?.value || 0);
    const choice = model.tiers?.[idx];
    const priceT = $_('#pkgPrice', overlay)?.textContent || '';
    applySelection(model, choice, priceT);
    await closeOverlay();
    if (typeof window.scrollToWithOffset === 'function') {
      window.scrollToWithOffset('#contact');
    } else {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* --- Клик хендлъри --- */
document.addEventListener('click', (e) => {
  const viewBtn   = e.target.closest('[data-view]');
  const chooseBtn = e.target.closest('[data-choose]');
  if (!viewBtn && !chooseBtn) return;

  const id = (viewBtn?.getAttribute('data-view') || chooseBtn?.getAttribute('data-choose') || '').trim();
  const list = window.PACKAGES?.packages || [];
  const model = list.find(p => (p.name || '').toLowerCase().replace(/\s+/g, '-') === id);
  if (!model) return;

  if (viewBtn) { renderPackageOverlay(model); return; }

  // директен избор
  const choice = Array.isArray(model.tiers) && model.tiers.length ? model.tiers[0] : null;
  const priceT = priceText(model.basePrice, choice?.multiplier ?? 1);
  applySelection(model, choice, priceT);

  if (typeof window.scrollToWithOffset === 'function') {
    window.scrollToWithOffset('#contact');
  } else {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* --- Помощник за попълване на бейджа и формата --- */
function applySelection(model, choice, priceTextStr) {
  const badge = document.getElementById('selectedPackageBadge');
  const val   = badge?.querySelector('.value');
  const field = document.getElementById('packageField');

  if (badge && val && field) {
    val.textContent = `${model.name}${choice ? ' · ' + (choice.label || '') : ''}${priceTextStr ? ' · ' + priceTextStr : ''}`;
    field.value = val.textContent;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    badge.classList.remove('d-none');
  }

  // опционално: попълване на "kids" и "budget"
  const kidsInput   = document.querySelector('input[name="kids"]');
  const budgetInput = document.querySelector('input[name="budget"]');
  let kidsVal = null;
  if (choice?.label) {
    const nums = (choice.label.match(/\d+/g) || []).map(n => Number(n)).filter(Number.isFinite);
    if (nums.length) kidsVal = Math.max(...nums);
  }
  if (kidsInput && Number.isFinite(kidsVal) && kidsVal > 0) {
    kidsInput.value = String(kidsVal);
    kidsInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const num = (() => {
    const m = (priceTextStr || '').match(/[\d\s.,]+/);
    if (!m) return null;
    const raw = m[0].replace(/\s/g, '');
    if (raw.includes('.') && raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!raw.includes('.') && raw.includes(',')) return Number(raw.replace(',', '.'));
    return Number(raw);
  })();

  if (budgetInput && Number.isFinite(num)) {
    budgetInput.value = num.toFixed(2).replace('.', ',');
    budgetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// експорт на рендера; извиква се от ленивия loader
window.renderPackagesSection = renderPackagesSection;

