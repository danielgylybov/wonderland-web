/**
 * packages.js — ЛЕНИВО рендериране на секцията „Пакети“ + детайлен оувърлей
 *
 * ОВЕРВЮ:
 * - Не прави мрежови заявки. Очаква window.PACKAGES да е вече зареден (напр. от JSONP).
 * - Рендерира карти на пакетите и оувърлей с пълни детайли, галерия и добавки.
 * - Цената се преизчислява динамично при смяна на tier и/или отметки по добавките.
 * - „Индикацията за добавки“ под цената има фиксирана височина и НЕ разширява лейаута.
 *
 * ДАННИ (window.PACKAGES):
 * {
 *   title, subtitle, currency ("лв"/"€"), pricePrefix ("от"),
 *   packages: [{
 *     name, desc, basePrice, featured?,
 *     tiers?: [{ label, multiplier }],
 *     features?: [string],
 *     extraInfo?: [string],                 // лява колона в оувърлея
 *     addOns?:                              // дясна колона (сумата им се добавя към цената)
 *       - масив от обекти: [{ label, price, checked? }]
 *       - ИЛИ масив от низове: ["Фото кът – 150 лв", " ... "]
 *       - ИЛИ JSON низ (от Sheets клетка): '[{"label":"Фото кът","price":150},{"label":"..."}]'
 *     gallery?: [URL], galleryIds?: [DriveId]
 *   }]
 * }
 *
 * БЕЛЕЖКИ:
 * - Ако „extraInfo“ или „addOns“ липсват, другата секция заема цялата ширина.
 * - При промяна на цената в оувърлея се обновява и цената върху съответната карта.
 */

/* ───────── Мини селектор ───────── */
const $_ = (s, r = document) => r.querySelector(s);

/* ───────── Динамични текстове/валута ───────── */
function getCopy() {
  const p = window.PACKAGES || {};
  return { viewMore: "Виж още", chooseText: "Избери пакет", pricePrefix: p.pricePrefix || "от" };
}
function getCurrency() {
  return (window.PACKAGES && window.PACKAGES.currency) || "лв";
}

/* ───────── Форматиране ───────── */
const esc = (s = "") => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const fmtPrice = (num) => Number(num || 0).toLocaleString("bg-BG");
function priceText(base, mult = 1) {
  const { pricePrefix } = getCopy(); const CURRENCY = getCurrency();
  const val = Math.round((Number(base)||0) * (Number(mult)||1));
  return `${esc(pricePrefix)} ${fmtPrice(val)} ${esc(CURRENCY)}`;
}

/* ───────── Обновяване на цената върху карта ───────── */
function setCardPriceById(cardId, absTotal) {
  const currency = getCurrency(); const { pricePrefix } = getCopy();
  const el = document.querySelector(`.pack-card[data-card-id="${cardId}"] .price`);
  if (el) el.textContent = `${esc(pricePrefix)} ${fmtPrice(Math.round(absTotal))} ${esc(currency)}`;
}

/* ───────── (Опция) Google Drive за галерия ───────── */
const PACKAGES_PARENT_FOLDER = '144a10jYonm6dXeMWZV7GLSRCkszUggcP';
const driveThumb = (id, w = 1600) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const _driveCache = new Map();
async function driveList(q, pageSize = 12) {
  if (!DRIVE_API_KEY) return { files: [] };
  const key = `q:${q}|p:${pageSize}`;
  if (_driveCache.has(key)) return _driveCache.get(key);
  const params = new URLSearchParams({ q, key: DRIVE_API_KEY, pageSize: String(pageSize),
    fields: 'files(id,name,mimeType),nextPageToken', orderBy: 'name' });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  const data = res.ok ? await res.json() : { files: [] };
  _driveCache.set(key, data); return data;
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
  const q = [`'${folderId}' in parents`, `mimeType contains 'image/'`, `trashed = false`].join(' and ');
  const data = await driveList(q, limit);
  return (data.files || []).slice(0, limit);
}

/* ───────── Scroll lock за модала ───────── */
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
  const html = document.documentElement; const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  document.body.classList.remove('no-scroll'); document.body.style.top = '';
  if (_scrollLock.pad) { document.body.style.paddingRight = ''; _scrollLock.pad = 0; }
  window.scrollTo(0, _scrollLock.y); html.style.scrollBehavior = prev || '';
  try { history.scrollRestoration = _scrollLock.prevRest; } catch(_) {}
  _scrollLock.on = false;
}

/* ───────── Карта на пакет ───────── */
function cardHTML(pkg) {
  const { viewMore, chooseText } = getCopy();
  const id = (pkg.name || "").toLowerCase().trim().replace(/\s+/g, "-");
  const feats = Array.isArray(pkg.features) ? pkg.features.slice(0, 3) : [];
  const firstMult = pkg.tiers?.[0]?.multiplier ?? 1;
  const highlight = pkg.featured ? ' style="border: 2px solid rgba(212,175,55,.35)"' : '';
  return `
  <div class="col-12 col-md-4 d-flex">
    <div class="pack-card p-4 w-100"${highlight} data-card-id="${esc(id)}">
      <h3 class="mb-2" style="font-family:'Rosarium',serif;">${esc(pkg.name)}</h3>
      <p class="opacity-75 mb-3">${esc(pkg.desc || "")}</p>
      <div class="price mb-3">${priceText(pkg.basePrice, firstMult)}</div>
      ${feats.length ? `<ul class="mb-4 opacity-90">${feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      <div class="d-flex gap-2 mt-auto">
        <button class="btn btn-outline-light w-50" type="button" data-view="${esc(id)}">${esc(viewMore)}</button>
        <button class="btn btn-primary w-50" type="button" data-choose="${esc(id)}">${esc(chooseText)}</button>
      </div>
    </div>
  </div>`;
}

/* ───────── Рендер на секцията ───────── */
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

/* ───────── Нормализация на добавки (поддържа 3 формата) ───────── */
function safeParseJSON(maybeJSON) {
  if (typeof maybeJSON !== 'string') return null;
  try { const val = JSON.parse(maybeJSON); return Array.isArray(val) ? val : null; }
  catch { return null; }
}
function parsePriceFromLabel(label) {
  const m = String(label || '').match(/([\-–—])?\s*([\d\s.,]+)\s*(лв|bgn|bgm)?\s*$/i);
  if (!m) return 0;
  const raw = m[2].replace(/\s/g, '');
  if (raw.includes('.') && raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
  if (!raw.includes('.') && raw.includes(',')) return Number(raw.replace(',', '.')) || 0;
  return Number(raw) || 0;
}
function normalizeAddons(source) {
  const fromJSON = safeParseJSON(source);
  if (fromJSON) {
    return fromJSON.map(obj => {
      const label = String(obj?.label ?? obj?.name ?? '').trim();
      const price = Number.isFinite(+obj?.price) ? +obj.price : parsePriceFromLabel(label);
      const checked = !!obj?.checked;
      return { label, price, checked };
    }).filter(a => a.label);
  }
  if (Array.isArray(source)) {
    return source.map(a => {
      if (a && typeof a === 'object') {
        const label = String(a.label || a.name || '').trim();
        const price = Number.isFinite(+a.price) ? +a.price : parsePriceFromLabel(label);
        const checked = !!a.checked;
        return { label, price, checked };
      }
      const label = String(a || '').trim();
      return { label, price: parsePriceFromLabel(label), checked: /^\s*(\[\s*x\s*\]|✓)/i.test(label) };
    }).map(a => ({ ...a, label: a.label.replace(/^\s*(\[\s*[x ]\s*\]|✓)\s*/i,'') }))
      .filter(a => a.label);
  }
  if (typeof source === 'string') {
    const parts = source.split(/\n|;/).map(s => s.trim()).filter(Boolean);
    return normalizeAddons(parts);
  }
  return [];
}

/* ───────── Оувърлей с детайли ───────── */
function renderPackageOverlay(model) {
  const { chooseText } = getCopy();
  const overlay = $_('#package-overlay'); if (!overlay) return;

  const cardId = (model.name || '').toLowerCase().trim().replace(/\s+/g, '-');
  const addons = normalizeAddons(model.addOns);

  const getTierMult = () => {
    const sel = $_('#pkgTier', overlay);
    const idx = Number(sel?.value || 0);
    return model.tiers?.[idx]?.multiplier ?? 1;
  };
  const sumSelectedAddons = () =>
    [...overlay.querySelectorAll('#pkgAddonsList input[type="checkbox"]')]
      .filter(cb => cb.checked)
      .reduce((s, cb) => s + (Number(cb.getAttribute('data-price')) || 0), 0);

  const hasExtra = Array.isArray(model.extraInfo) && model.extraInfo.length > 0;
  const hasAdds  = addons.length > 0;
  const bothCols = hasExtra && hasAdds;
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
              <div class="pkg-price text-end">
                <div id="pkgPrice"></div>
                <div
                  class="opacity-75 small"
                  id="pkgAddonsInfo"
                  style="height:1.25em;line-height:1.25em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                >&nbsp;</div>
              </div>
            </div>
          </div>
        </div>

        <div class="pkg-card">
          <div id="pkgCarouselWrap">
            <div class="text-center opacity-75" id="pkgLoading">Зареждане…</div>
          </div>
        </div>

        ${(hasExtra || hasAdds) ? `
          ${bothCols ? `
            <div class="pkg-grid">
              ${hasExtra ? `
                <div class="pkg-card">
                  <div class="pkg-label mb-2">Допълнителна информация</div>
                  <ul class="mb-0">${model.extraInfo.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
                </div>` : ''}
              ${hasAdds ? `
                <div class="pkg-card">
                  <div class="pkg-label mb-2">Добавки</div>
                  <div id="pkgAddonsList">
                    ${addons.map(a => `
                      <label class="pkg-addon d-flex align-items-center gap-2 mb-2">
                        <input type="checkbox" ${a.checked ? 'checked' : ''} data-price="${a.price || 0}">
                        <span class="flex-grow-1">${esc(a.label)}</span>
                        ${a.price ? `<span class="opacity-75">${fmtPrice(a.price)} ${esc(getCurrency())}</span>` : ''}
                      </label>
                    `).join('')}
                  </div>
                </div>` : ''}
            </div>
          ` : `
            <div class="pkg-grid">
              <div class="pkg-card" style="grid-column: 1 / -1;">
                ${hasExtra ? `
                  <div>
                    <div class="pkg-label mb-2">Допълнителна информация</div>
                    <ul class="mb-0">${model.extraInfo.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
                  </div>
                ` : `
                  <div>
                    <div class="pkg-label mb-2">Добавки</div>
                    <div id="pkgAddonsList">
                      ${addons.map(a => `
                        <label class="pkg-addon d-flex align-items-center gap-2 mb-2">
                          <input type="checkbox" ${a.checked ? 'checked' : ''} data-price="${a.price || 0}">
                          <span class="flex-grow-1">${esc(a.label)}</span>
                          ${a.price ? `<span class="opacity-75">${fmtPrice(a.price)} ${esc(getCurrency())}</span>` : ''}
                        </label>
                      `).join('')}
                    </div>
                  </div>
                `}
              </div>
            </div>
          `}
        ` : ''}
      </div>

      <div class="pkg-footer">
        <button class="btn btn-outline-light" id="pkgBack">Назад</button>
        <button class="btn btn-primary" id="pkgChoose">${esc(chooseText)}</button>
      </div>
    </div>
  `;

  (async () => {
    try { if (typeof curtainsClose === 'function') await curtainsClose(); } catch(_) {}
    try { lockScroll(); } catch(_) {}
    overlay.classList.remove('d-none');
    requestAnimationFrame(() => overlay.classList.add('show'));
  })();

  const priceEl = $_('#pkgPrice', overlay);
  const addonsInfo = $_('#pkgAddonsInfo', overlay);
  function recalc() {
    const base = Number(model.basePrice || 0) * getTierMult();
    const extra = sumSelectedAddons();
    const total = base + extra;
    const currency = getCurrency();
    priceEl.textContent = `${fmtPrice(Math.round(total))} ${currency}`;
    if (addonsInfo) {
      addonsInfo.textContent = extra ? `вкл. добавки: + ${fmtPrice(extra)} ${currency}` : '\u00A0';
    }
    setCardPriceById(cardId, total);
  }

  $_('#pkgTier', overlay)?.addEventListener('change', recalc, { passive: true });
  const addonsWrap = $_('#pkgAddonsList', overlay);
  if (addonsWrap) {
    const trigger = () => recalc();
    addonsWrap.addEventListener('change', trigger, { passive: true });
    addonsWrap.addEventListener('click', (e) => {
      if (e.target && (e.target.matches('input[type="checkbox"]') || e.target.closest('.pkg-addon'))) {
        setTimeout(recalc, 0);
      }
    });
  }
  recalc();

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
        const folderName = (model.name || '').toLowerCase().trim();
        const subId = await findSubfolderIdByName(folderName);
        if (subId) {
          const imgs = await listImagesInFolder(subId, 8);
          files = imgs.map(f => ({ type: 'drive', id: f.id }));
        }
      }

      loading?.remove();
      if (!files.length) { wrap.innerHTML = `<div class="opacity-75">Няма изображения за този пакет.</div>`; return; }

      const slides = files.slice(0, 8).map((f, i) => `
        <div class="carousel-item ${i===0?'active':''}">
          <img class="d-block w-100"
               src="${f.type==='url' ? esc(f.src) : driveThumb(f.id, 1600)}"
               alt="" loading="${i===0?'eager':'lazy'}" decoding="async">
        </div>
      `).join('');

      const indicators = files.length > 1 ? `
        <div class="carousel-indicators">
          ${files.map((_, i) => `
            <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i}"
              ${i===0?'class="active" aria-current="true"':''} aria-label="Слайд ${i+1}"></button>
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
      if (window.bootstrap?.Carousel) new bootstrap.Carousel(document.getElementById(carouselId), { interval: 3000, pause: 'hover', touch: true });
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
    const sel = $_('#pkgTier', overlay);
    const idx = Number(sel?.value || 0);
    const choice = model.tiers?.[idx];

    const chosenAddons = [...overlay.querySelectorAll('.pkg-addon input[type="checkbox"]')]
      .filter(cb => cb.checked)
      .map(cb => {
        const row = cb.closest('.pkg-addon');
        const lbl = row?.querySelector('span')?.textContent?.trim() || '';
        let pr = Number(cb.getAttribute('data-price') || 0);
        if (!Number.isFinite(pr)) pr = parsePriceFromLabel(lbl);
        return { label: lbl, price: pr };
      });

    const base = Number(model.basePrice || 0) * (choice?.multiplier ?? 1);
    const extra = chosenAddons.reduce((s,a)=>s+(a.price||0),0);
    const priceT = `${fmtPrice(Math.round(base + extra))} ${getCurrency()}`;

    applySelection({ ...model, _chosenAddons: chosenAddons }, choice, priceT);

    await closeOverlay();
    if (typeof window.scrollToWithOffset === 'function') {
      window.scrollToWithOffset('#contact');
    } else {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* ───────── Глобални клик хендлъри (карти) ───────── */
document.addEventListener('click', (e) => {
  const viewBtn   = e.target.closest('[data-view]');
  const chooseBtn = e.target.closest('[data-choose]');
  if (!viewBtn && !chooseBtn) return;

  const id = (viewBtn?.getAttribute('data-view') || chooseBtn?.getAttribute('data-choose') || '').trim();
  const list = window.PACKAGES?.packages || [];
  const model = list.find(p => (p.name || '').toLowerCase().replace(/\s+/g, '-') === id);
  if (!model) return;

  if (viewBtn) { renderPackageOverlay(model); return; }

  const choice = Array.isArray(model.tiers) && model.tiers.length ? model.tiers[0] : null;
  const priceT = priceText(model.basePrice, choice?.multiplier ?? 1);
  applySelection(model, choice, priceT);

  if (typeof window.scrollToWithOffset === 'function') {
    window.scrollToWithOffset('#contact');
  } else {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* ───────── Попълване на бейджа и формата ───────── */
/* ───────── Попълване на бейджа и формата ───────── */
function applySelection(model, choice, priceTextStr) {
  const badge = document.getElementById('selectedPackageBadge');
  const val   = badge?.querySelector('.value');

  const hfPkg        = document.getElementById('packageField');
  const hfTier       = document.getElementById('pkgTierLabel');
  const hfAddons     = document.getElementById('pkgAddons');
  const hfTotal      = document.getElementById('pkgTotal');
  const hfCurrency   = document.getElementById('pkgCurrency');
  const hfJson       = document.getElementById('pkgDataJson');

  // четими стойности
  const currency  = getCurrency();
  const tierLabel = choice?.label || '';
  const addonsArr = Array.isArray(model._chosenAddons) ? model._chosenAddons : [];
  const addonsCSV = addonsArr.map(a => `${a.label}${a.price?` (+${fmtPrice(a.price)} ${currency})`:''}`).join(', ');

  // извади тотала от текста (пример: "1 200 лв")
  const totalNum = (() => {
    const m = (priceTextStr || '').match(/[\d\s.,]+/);
    if (!m) return null;
    const raw = m[0].replace(/\s/g, '');
    if (raw.includes('.') && raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!raw.includes('.') && raw.includes(',')) return Number(raw.replace(',', '.'));
    return Number(raw);
  })();

  // Видим бейдж
  const summaryText = `${model.name}${tierLabel ? ' · ' + tierLabel : ''}${priceTextStr ? ' · ' + priceTextStr : ''}`;
  if (badge && val) {
    val.textContent = summaryText;
    badge.classList.remove('d-none');
  }

  // Скритите полета (ако съществуват)
  if (hfPkg)      { hfPkg.value = summaryText; hfPkg.dispatchEvent(new Event('change', { bubbles: true })); }
  if (hfTier)     hfTier.value = tierLabel;
  if (hfAddons)   hfAddons.value = addonsCSV;
  if (hfTotal)    hfTotal.value = Number.isFinite(totalNum) ? String(totalNum) : '';
  if (hfCurrency) hfCurrency.value = currency;

  if (hfJson) {
    const payload = {
      name: model.name,
      tier: tierLabel || null,
      basePrice: Number(model.basePrice||0),
      total: Number.isFinite(totalNum) ? totalNum : null,
      currency,
      addons: addonsArr.map(a => ({ label: a.label, price: Number(a.price||0) }))
    };
    hfJson.value = JSON.stringify(payload);
  }

  // Авто-попълване на kids/budget
  const kidsInput   = document.querySelector('input[name="kids"]');
  if (kidsInput && tierLabel) {
    const nums = (tierLabel.match(/\d+/g) || []).map(Number).filter(Number.isFinite);
    if (nums.length) {
      kidsInput.value = String(Math.max(...nums));
      kidsInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  const budgetInput = document.querySelector('input[name="budget"]');
  if (budgetInput && Number.isFinite(totalNum)) {
    budgetInput.value = totalNum.toFixed(2).replace('.', ',');
    budgetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 🔔 Ново: глобално събитие към contact.js (EmailJS ще вземе JSON-а)
  const eventDetail = {
    model: { name: model.name, basePrice: Number(model.basePrice||0) },
    choice: choice ? { label: choice.label, multiplier: choice.multiplier } : null,
    summaryText,
    total: Number.isFinite(totalNum) ? totalNum : null,
    currency,
    addonsPicked: addonsArr.map(a => ({ label: a.label, price: Number(a.price||0) }))
  };
  document.dispatchEvent(new CustomEvent('wl:package-selected', { detail: eventDetail }));
}


/* ───────── Експорт на рендера (вика се от loader-а) ───────── */
window.renderPackagesSection = renderPackagesSection;
