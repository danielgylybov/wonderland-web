/* packages.js – overlay + завеси + мини-галерия от Google Drive
 * Използва глобалното window.DRIVE_API_KEY (дефиниран в drive-gallery.js)
 * и parentFolderId за пакетите (папки с името на пакета в lower-case).
 */

const $_ = (s, r = document) => r.querySelector(s);

/* === Helpers: copy/data/escape/price === */
const _copy = Object.assign({
  title: "Пакети",
  subtitle: "Избери ниво според мечтата и мащаба. Винаги може да персонализираме.",
  pricePrefix: "от",
  viewMore: "Виж още",
  galleryCta: "Виж Галерия",
  card: {
    titleTag: "h3",
    titleClass: "mb-2",
    descClass: "opacity-75 mb-3",
    priceClass: "price mb-3",
    featuresClass: "mb-4 opacity-90",
    buttonClass: "btn btn-primary w-100 view-more",
    buttonText: "Детайли"
  }
}, window.PACKAGES_COPY || {});

const _data = window.PACKAGES_DATA || { currency: "лв", packages: [] };

const _esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
           .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const _fmtPrice = (num) => Number(num || 0).toLocaleString('bg-BG');

const _priceText = (pkg, currency) =>
  `${_esc(_copy.pricePrefix)} ${_fmtPrice(pkg.basePrice)} ${_esc(currency)}`;

/* === Google Drive helpers === */
const PACKAGES_PARENT_FOLDER = '144a10jYonm6dXeMWZV7GLSRCkszUggcP';

const _driveCache = new Map(); // проста кешираща карта за заявки по ключ

const driveThumb = (id, w = 400) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

const apiKey = () => (DRIVE_API_KEY || '').trim();

async function driveList(query, pageSize = 100) {
  if (!apiKey()) throw new Error('Missing DRIVE_API_KEY');

  const cacheKey = `q:${query}|p:${pageSize}`;
  if (_driveCache.has(cacheKey)) return _driveCache.get(cacheKey);

  const params = new URLSearchParams({
    q: query,
    key: apiKey(),
    pageSize: String(pageSize),
    fields: 'files(id,name,mimeType),nextPageToken',
    orderBy: 'name',
  });

  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Drive API error: ' + res.status);

  const data = await res.json();
  _driveCache.set(cacheKey, data);
  return data;
}

const escapeDriveName = (name = '') => name.replace(/'/g, "\\'");

async function findSubfolderIdByName(folderName) {
  const q = [
    `name = '${escapeDriveName(folderName)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${PACKAGES_PARENT_FOLDER}' in parents`,
    `trashed = false`,
  ].join(' and ');

  const data = await driveList(q, 10);
  return data.files?.[0]?.id ?? null;
}

async function listImagesInFolder(folderId, limit = 9) {
  if (!folderId) return [];
  const q = [
    `'${folderId}' in parents`,
    `mimeType contains 'image/'`,
    `trashed = false`,
  ].join(' and ');
  const data = await driveList(q, limit);
  return (data.files || []).slice(0, limit);
}

/* === Scroll lock for overlay (iOS-friendly, без „подскок“) === */
const _scrollLock = { y: 0, pad: 0, locked: false, prevRestoration: null };

function lockScroll() {
  if (_scrollLock.locked) return;

  _scrollLock.y = window.scrollY || document.documentElement.scrollTop || 0;

  // изключи авто-възстановяване от браузъра
  _scrollLock.prevRestoration = history.scrollRestoration;
  try { history.scrollRestoration = 'manual'; } catch(_) {}

  // компенсирай скролбара на десктоп (ширината да не „подскача“)
  const sb = window.innerWidth - document.documentElement.clientWidth;
  if (sb > 0) {
    _scrollLock.pad = sb;
    document.body.style.paddingRight = sb + 'px';
  }

  document.body.style.top = `-${_scrollLock.y}px`;
  document.body.classList.add('no-scroll');
  _scrollLock.locked = true;
}

function unlockScroll() {
  if (!_scrollLock.locked) return;

  const html = document.documentElement;
  const y = _scrollLock.y;

  // временно изключи smooth, за да върнем позицията мигновено
  const prevBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';

  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  if (_scrollLock.pad) {
    document.body.style.paddingRight = '';
    _scrollLock.pad = 0;
  }
  window.scrollTo(0, y); // без анимация

  // възстанови предишните настройки
  html.style.scrollBehavior = prevBehavior || '';
  try { history.scrollRestoration = _scrollLock.prevRestoration; } catch(_) {}

  _scrollLock.locked = false;
}


/* === Dynamic Packages Section (cards) === */
function _cardHTML(pkg, currency) {
  const feats = Array.isArray(pkg.features) ? pkg.features.slice(0, 3) : [];
  const btnId = (pkg.id || (pkg.name || "").toLowerCase()).trim();
  const c = _copy.card || {};
  const titleTag = c.titleTag || "h3";
  const highlightStyle = pkg.featured ? ' style="border-color: rgba(212,175,55,.35)"' : '';

  return `
  <div class="col-12 col-md-4 d-flex">
    <div class="pack-card p-4 w-100"${highlightStyle}>
      <${titleTag} class="${_esc(c.titleClass || "")}" style="font-family:'Rosarium',serif;">
        ${_esc(pkg.name)}
      </${titleTag}>
      <p class="${_esc(c.descClass || "")}">${_esc(pkg.desc || "")}</p>
      <div class="${_esc(c.priceClass || "")}">${_priceText(pkg, currency)}</div>
      ${
        feats.length
          ? `<ul class="${_esc(c.featuresClass || "")}">${feats.map(li => `<li>${_esc(li)}</li>`).join("")}</ul>`
          : ""
      }
      <button class="${_esc(c.buttonClass || "")}" type="button" data-view-package="${_esc(btnId)}">
        ${_esc(c.buttonText || _copy.viewMore)}
      </button>
    </div>
  </div>`;
}

function renderPackagesSection() {
  const root = document.getElementById("packages-root");
  if (!root) return;

  const currency = _data.currency || "лв";
  const pkgs = Array.isArray(_data.packages) ? _data.packages : [];
  const cards = pkgs.map(p => _cardHTML(p, currency)).join("");

  root.innerHTML = `
    <h2 class="text-center mb-4" style="font-family:'Rosarium',serif;">${_esc(_copy.title)}</h2>
    <p class="text-center mb-5">${_esc(_copy.subtitle)}</p>

    <div class="row g-4">
      ${cards || `<div class="col-12"><div class="text-center opacity-75">В момента няма активни пакети.</div></div>`}
    </div>

    <div class="text-center mt-4">
      <button class="btn btn-lg btn-primary" data-scroll="#gallery">${_esc(_copy.galleryCta)}</button>
    </div>
  `;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderPackagesSection, { once: true });
} else {
  renderPackagesSection();
}

/* === Overlay render === */
function renderPackageOverlay(model) {
  const overlay = $_('#package-overlay');
  if (!overlay) return;

  // уникален id за карусела (ако отвориш няколко последователно)
  const carouselId = `pkgCarousel-${Date.now()}`;

  overlay.innerHTML = `
    <div class="pkg-sheet">
      <div class="pkg-header">
        <div>
          <div class="pkg-title">${_esc(model.name)}</div>
          <div class="opacity-75">${_esc(model.desc || '')}</div>
        </div>
        <button class="pkg-close" aria-label="Затвори">×</button>
      </div>

      <div class="pkg-body">
        <div class="pkg-grid">
          <div class="pkg-card">
            <div class="pkg-label mb-2">Какво включва:</div>
            <ul class="mb-0">${(model.features || []).map(f => `<li>${_esc(f)}</li>`).join('')}</ul>
          </div>

          <div class="pkg-card">
            <div class="pkg-label mb-1">Брой гости:</div>
            <select class="form-select pkg-select" id="pkgTier">
              ${(model.tiers || []).map((t, i) => `<option value="${i}">${_esc(t.label)}</option>`).join('')}
            </select>

            <div class="d-flex align-items-center justify-content-between mt-3">
              <div class="pkg-label">Ориентировъчна цена</div>
              <div class="pkg-price" id="pkgPrice"></div>
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
                ${model.addOns.map(a => `<li>${_esc(a)}</li>`).join("")}
              </ul>
            </div>
          ` : '' }
      </div>

      <div class="pkg-footer">
        <button class="btn btn-outline-light" id="pkgBack">Назад</button>
        <button class="btn btn-primary" id="pkgEnquire">Запитване</button>
      </div>
    </div>
  `;

  function buildCarouselHTML(files, carouselId) {
    const slides = files.map((f, i) => `
      <div class="carousel-item ${i === 0 ? 'active' : ''}">
        <img
          class="d-block w-100"
          src="${driveThumb(f.id, 1600)}"
          alt=""
          loading="${i === 0 ? 'eager' : 'lazy'}"
          decoding="async"
        >
      </div>
    `).join('');

    const indicators = files.length > 1 ? `
      <div class="carousel-indicators">
        ${files.map((_, i) => `
          <button type="button"
            data-bs-target="#${carouselId}"
            data-bs-slide-to="${i}"
            ${i === 0 ? 'class="active" aria-current="true"' : ''}
            aria-label="Слайд ${i + 1}">
          </button>
        `).join('')}
      </div>
    ` : '';

    const controls = files.length > 1 ? `
      <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" aria-label="Предишен">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next" aria-label="Следващ">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
      </button>
    ` : '';

    return `
      <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000" data-bs-pause="hover" data-bs-touch="true">
        ${indicators}
        <div class="carousel-inner">
          ${slides}
        </div>
        ${controls}
      </div>
    `;
  }

  /* === Показване със затваряне на завесите === */
  (async () => {
    await curtainsClose();
    lockScroll();                          // ← БЛОКИРАЙ СКРОЛА ТУК
    overlay.classList.remove('d-none');
    requestAnimationFrame(() => overlay.classList.add('show'));
  })();


  /* === Цена по избор на tier === */
  const sel = $_('#pkgTier', overlay);
  const priceEl = $_('#pkgPrice', overlay);
  const currency = _data.currency || 'лв';

  const recalc = () => {
    const idx = Number(sel.value) || 0;
    const mult = model.tiers?.[idx]?.multiplier ?? 1;
    priceEl.textContent = `${_fmtPrice(Math.round((model.basePrice || 0) * mult))} ${currency}`;
  };
  recalc();
  sel.addEventListener('change', recalc, { passive: true });

  /* === Мини-карусел от Google Drive === */
  (async () => {
    const wrap = $_('#pkgCarouselWrap', overlay);
    const loading = $_('#pkgLoading', overlay);
    try {
      let files = [];

      if (Array.isArray(model.galleryIds) && model.galleryIds.length) {
        files = model.galleryIds.map(id => ({ id, name: '' }));
      } else {
        const folderName = (model.name || '').toLowerCase().trim();
        const subId = await findSubfolderIdByName(folderName);
        if (subId) files = await listImagesInFolder(subId, 6);
      }

      loading?.remove();

      if (!files.length) {
        wrap.innerHTML = `<div class="opacity-75">Няма изображения за този пакет.</div>`;
        return;
      }

      files = files.slice(0, 6);
      wrap.innerHTML = buildCarouselHTML(files, carouselId);

      // Ако Bootstrap JS не е инициализиран глобално:
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

  // първо възстанови скрола мигновено (без smooth)
  unlockScroll();

  // после отваряй завесите (няма да повлияят на скрола)
  await curtainsOpen();
};



  $_('.pkg-close', overlay)?.addEventListener('click', closeOverlay);
  $_('#pkgBack', overlay)?.addEventListener('click', closeOverlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  /* === „Запитване“ → попълни формата и скролни === */
  $_('#pkgEnquire', overlay)?.addEventListener('click', async () => {
    const idx = Number($_('#pkgTier', overlay)?.value || 0);
    const choice = model.tiers?.[idx];
    const price = $_('#pkgPrice', overlay)?.textContent || '';

    const badge = document.getElementById('selectedPackageBadge');
    const val = badge?.querySelector('.value');
    const field = document.getElementById('packageField');

    if (badge && val && field) {
      val.textContent = `${model.name}${choice ? ' · ' + choice.label : ''}${price ? ' · ' + price : ''}`;
      field.value = model.name;
      badge.classList.remove('d-none');
    }

    await closeOverlay();
    scrollToWithOffset('#contact');
  });
}

/* === Слушател на бутоните „Виж още“ ===
   Търси по id (предпочитано), fallback: по name (lower-case) */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view-package]');
  if (!btn) return;

  e.preventDefault();
  const key = (btn.getAttribute('data-view-package') || '').trim().toLowerCase();

  const list = (window.PACKAGES_DATA?.packages || []);
  let model = list.find(p => (p.id || '').toLowerCase() === key);
  if (!model) model = list.find(p => (p.name || '').toLowerCase() === key);

  if (model) renderPackageOverlay(model);
});
