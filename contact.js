/**
 * contact.js
 * -----------------------------------------------------------------------------
 * Форма за запитване: динамични полета по тип събитие, проверка на капацитет
 * спрямо избран пакет, UX помощници (toasts, модали), изпращане през EmailJS
 * и адаптивно скалиране на формата на десктоп.
 *
 * Основни идеи:
 * - Формата изисква избран пакет (от секцията „Пакети“).
 * - „Тип събитие“ рендерира специфични полета (birthday/christmas/graduation/private).
 * - Ако въведеният брой деца надвишава капацитета на текущия tier, предлагаме по-голям.
 * - Изпращане през EmailJS с плоски полета + HTML резюме за по-лесно четене.
 * - На десктоп формата се скалира, за да остане „Изпрати“ в рамките на прозореца.
 * -----------------------------------------------------------------------------
 */

(() => {
  /** @type {HTMLFormElement} */
  const form         = document.getElementById('contactForm');
  /** @type {HTMLButtonElement} */
  const submitBtn    = form.querySelector('button[type="submit"]');
  const packageField = document.getElementById('packageField');
  const pkgBadge     = document.getElementById('selectedPackageBadge');
  const dateField    = document.getElementById('dateField');

  // Минимална дата = днес (YYYY-MM-DD)
  const today = new Date();
  dateField.min = [
    today.getFullYear(),
    String(today.getMonth()+1).padStart(2,'0'),
    String(today.getDate()).padStart(2,'0')
  ].join('-');

  // Анти-спам между изпращанията (30s)
  const canSend  = () => Date.now() - (Number(localStorage.getItem('contact_last_send')||0)) > 30_000;
  const markSent = () => localStorage.setItem('contact_last_send', String(Date.now()));

  // Пакет: изискване и изчистване
  const packageChosen = () => (packageField?.value || '').trim().length > 0;
  pkgBadge?.querySelector('.clear')?.addEventListener('click', () => {
    if (!packageField) return;
    packageField.value = '';
    packageField.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Динамични полета по „Тип събитие“
  const eventTypeSel = document.getElementById('eventType');
  const extraWrap    = document.getElementById('eventExtraFields');

  /** Шаблони за допълнителни полета по тип събитие */
  const templates = {
    birthday: () => `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Име на детето</label>
          <input type="text" name="childName" class="form-control" placeholder="напр. Стефи">
        </div>
        <div class="col-md-3">
          <label class="form-label">Години</label>
          <input type="number" name="age" class="form-control" min="1" max="120" placeholder="8">
        </div>
        <div class="col-md-3">
          <label class="form-label">Брой деца</label>
          <input type="number" name="kids" class="form-control" min="1" placeholder="10">
        </div>
        <div class="col-md-6">
          <label class="form-label">Тема</label>
          <input type="text" name="theme" class="form-control" placeholder="Принцеси, Космос…">
        </div>
      </div>
    `,
    christmas: () => `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Декорация</label>
          <select name="decor" class="form-select">
            <option value="Да, коледна украса">Да, коледна украса</option>
            <option value="Не, ще осигурим ние">Не, ще осигурим ние</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Възрастов състав</label>
          <select name="ageMix" class="form-select">
            <option value="Основно деца">Основно деца</option>
            <option value="Смесено">Смесено</option>
            <option value="Основно възрастни">Основно възрастни</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Приблизителен брой гости</label>
          <input type="number" name="guests" class="form-control" min="1" placeholder="напр. 20">
        </div>
      </div>
    `,
    graduation: () => `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Детска градина / Училище</label>
          <input type="text" name="school" class="form-control" placeholder="ДГ/СУ „...”">
        </div>
        <div class="col-md-6">
          <label class="form-label">Брой завършващи</label>
          <input type="number" name="graduates" class="form-control" min="1" placeholder="напр. 8">
        </div>
      </div>
    `,
    private: () => `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Брой гости</label>
          <input type="number" name="guests" class="form-control" min="1" placeholder="напр. 25">
        </div>
        <div class="col-md-8">
          <label class="form-label">Вид на гостите</label>
          <select name="guestType" class="form-select">
            <option value="Деца">Деца</option>
            <option value="Възрастни">Възрастни</option>
            <option value="Смесено">Смесено</option>
          </select>
        </div>
      </div>
    `
  };

  /**
   * Попълва автоматично „Брой деца“ от избрания пакет (ако tier етикетът съдържа число).
   */
  function prefillFromPackageIfPossible() {
    if (selectedPackageMeta) {
      const kidsInput = form.querySelector('input[name="kids"]');
      if (kidsInput && selectedPackageMeta.choice?.label) {
        const nums = (selectedPackageMeta.choice.label.match(/\d+/g) || []).map(Number).filter(Number.isFinite);
        if (nums.length && !kidsInput.value) kidsInput.value = String(Math.max(...nums));
      }
      return;
    }
    const tierLabel = (document.getElementById('pkgTierLabel')?.value || '').trim();
    const kidsInput = form.querySelector('input[name="kids"]');
    if (kidsInput && tierLabel) {
      const nums = (tierLabel.match(/\d+/g) || []).map(Number).filter(Number.isFinite);
      if (nums.length && !kidsInput.value) kidsInput.value = String(Math.max(...nums));
    }
  }

  /**
   * Рендерира допълнителните полета за даден тип събитие.
   * @param {string} type
   */
  function renderExtraFields(type) {
    extraWrap.innerHTML = templates[type]?.() || '';
    prefillFromPackageIfPossible();
    bindKidsWatcher();
  }

  eventTypeSel?.addEventListener('change', () => renderExtraFields(eventTypeSel.value));

  // Детайли за избрания пакет (идват от packages.js чрез custom event)
  let selectedPackageMeta = null;
  document.addEventListener('wl:package-selected', (e) => {
    selectedPackageMeta = e?.detail || null;
    prefillFromPackageIfPossible();
  });

  // --------- Проверка на капацитет спрямо „Брой деца“ ---------

  function findPackageModelByName(name){
    const list = (window.PACKAGES && Array.isArray(window.PACKAGES.packages)) ? window.PACKAGES.packages : [];
    return list.find(p => String(p.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase()) || null;
  }
  function capacityFromTierLabel(label){
    const nums = (String(label||'').match(/\d+/g) || []).map(Number).filter(Number.isFinite);
    return nums.length ? Math.max(...nums) : null;
  }
  function findTierIndexForKids(model, kids){
    if (!model || !Array.isArray(model.tiers) || !model.tiers.length) return null;
    const caps = model.tiers.map(t => capacityFromTierLabel(t.label));
    if (caps.every(v => v == null)) return null;
    for (let i=0;i<model.tiers.length;i++){
      const cap = caps[i];
      if (cap == null) continue;
      if (kids <= cap) return i;
    }
    let lastIdx = -1, bestCap = -Infinity;
    caps.forEach((c, i) => { if (c != null && c > bestCap){ bestCap = c; lastIdx = i; }});
    return lastIdx >= 0 ? lastIdx : null;
  }
  function currentTierIndex(model, tierLabel){
    if (!model || !Array.isArray(model.tiers)) return null;
    const idx = model.tiers.findIndex(t => String(t.label||'').trim() === String(tierLabel||'').trim());
    return idx >= 0 ? idx : null;
  }
  function openOverlayPreselectTier(model, targetIdx){
    if (typeof window.renderPackageOverlay === 'function'){
      window.renderPackageOverlay(model);
      requestAnimationFrame(() => {
        const overlay = document.getElementById('package-overlay') || document;
        const sel = overlay.querySelector('#pkgTier');
        if (sel){
          sel.value = String(targetIdx);
          sel.dispatchEvent(new Event('change', { bubbles:true }));
        }
      });
    }
  }

  /**
   * Показва модал при несъответствие между „Брой деца“ и капацитет на tier.
   */
  function showTierMismatchModal({model, targetIdx}){
    injectStylesOnce();
    if (document.getElementById('wl-tier-mismatch')) return;

    const overlay = document.createElement('div');
    overlay.id = 'wl-tier-mismatch';
    overlay.className = 'wl-modal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML = `
      <a href="#" class="wl-visually-hidden" id="wl-first-focus">.</a>
      <div class="wl-modal" role="document">
        <div class="wl-modal__header">
          <h3 class="wl-modal__title">Повече гости от пакета</h3>
          <button type="button" class="wl-modal__close" aria-label="Затвори" title="Затвори">×</button>
        </div>
        <div class="wl-modal__body">
          <p class="lead">Въведеният брой деца надхвърля капацитета на избрания пакет.</p>
          <p>Предлагаме по-голям размер (следващ tier), за да видиш актуална ориентировъчна цена.</p>
        </div>
        <div class="wl-modal__footer" style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.08)">
          <button type="button" class="wl-btn" id="wl-ignore">Ще коригирам ръчно</button>
          <button type="button" class="wl-btn wl-btn--gold" id="wl-adjust">Промени пакета</button>
        </div>
      </div>
      <a href="#" class="wl-visually-hidden" id="wl-last-focus">.</a>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.wl-modal__close').addEventListener('click', close);
    overlay.querySelector('#wl-ignore').addEventListener('click', close);
    overlay.querySelector('#wl-adjust').addEventListener('click', () => { close(); openOverlayPreselectTier(model, targetIdx); });

    const first = overlay.querySelector('#wl-first-focus');
    const last  = overlay.querySelector('#wl-last-focus');
    const primaryBtn = overlay.querySelector('#wl-adjust');
    first.addEventListener('focus', () => primaryBtn.focus());
    last.addEventListener('focus',  () => primaryBtn.focus());
    primaryBtn.focus();
  }

  function checkKidsTierMismatch(){
    if (!selectedPackageMeta || !selectedPackageMeta.model?.name || !selectedPackageMeta.choice?.label) return null;
    const kidsVal = Number((form.querySelector('input[name="kids"]')?.value || '').replace(',','.'));
    if (!Number.isFinite(kidsVal) || kidsVal <= 0) return null;

    const model = findPackageModelByName(selectedPackageMeta.model.name);
    if (!model) return null;

    const curIdx = currentTierIndex(model, selectedPackageMeta.choice.label);
    if (curIdx == null) return null;

    const targetIdx = findTierIndexForKids(model, kidsVal);
    if (targetIdx == null) return null;

    return targetIdx > curIdx ? { model, currentIdx: curIdx, targetIdx } : null;
  }

  function bindKidsWatcher(){
    const kidsInput = form.querySelector('input[name="kids"]');
    if (!kidsInput) return;
    let t = 0;
    const onCheck = () => { const m = checkKidsTierMismatch(); if (m) showTierMismatchModal(m); };
    kidsInput.removeEventListener('input', kidsInput.__wlKidsHandler || (()=>{}));
    kidsInput.__wlKidsHandler = () => { clearTimeout(t); t = setTimeout(onCheck, 350); };
    kidsInput.addEventListener('input', kidsInput.__wlKidsHandler);
  }

  // --------- UI helpers: styles, toasts, focus ---------

  function injectStylesOnce() {
    if (document.getElementById('wl-validate-style')) return;
    const css = `
      .wl-toast-holder{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:11000;display:grid;gap:10px;justify-items:center;pointer-events:none}
      .wl-toast{pointer-events:auto;display:flex;align-items:center;gap:.6rem;padding:.6rem .9rem;border-radius:999px;background:rgba(12,18,38,.85);backdrop-filter:blur(6px);border:1px solid rgba(212,175,55,.35);box-shadow:0 8px 28px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.06);color:var(--text);transform:translateY(6px);opacity:0;transition:opacity .25s ease,transform .25s ease;font:500 14px/1.2 "CraftworkGrotesk",system-ui,Arial,sans-serif}
      .wl-toast.show{opacity:1;transform:translateY(0)}
      .wl-toast__icon{width:18px;height:18px;display:grid;place-items:center;opacity:.9}
      .wl-toast--success{border-color:rgba(216,158,88,.55)}
      .wl-toast--warning{border-color:rgba(241,195,122,.65)}
      .wl-toast--danger{border-color:rgba(255,120,120,.45)}
      .wl-field-attn{outline:2px solid var(--wantgold);box-shadow:0 0 0 .2rem rgba(216,158,88,.25) !important;border-color:var(--wantgold) !important;animation:wl-shake .25s ease-in-out 0s 1}
      @keyframes wl-shake{0%{transform:translateX(0)}25%{transform:translateX(-2px)}50%{transform:translateX(2px)}75%{transform:translateX(-1px)}100%{transform:translateX(0)}
      }
      .wl-modal-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)}
      .wl-modal{width:min(560px,92vw);background:rgba(12,18,38,.92);color:var(--text);border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column}
      .wl-modal__header,.wl-modal__footer{padding:14px 16px;border-color:rgba(255,255,255,.08)}
      .wl-modal__header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.08)}
      .wl-modal__title{margin:0;font-family:"Rosarium",serif;color:var(--wantgold)}
      .wl-modal__body{padding:12px 16px 6px}
      .wl-btn{padding:.5rem .9rem;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:var(--text)}
      .wl-btn--gold{color:#1d1205;background:linear-gradient(180deg,var(--gold-2),var(--gold));border:0;box-shadow:0 8px 20px -8px rgba(216,158,88,.6),inset 0 1px 0 rgba(255,255,255,.35)}
      .wl-modal__close{border:0;background:transparent;color:#fff;opacity:.8;font-size:1.4rem;line-height:1;cursor:pointer}
      .wl-visually-hidden{position:absolute !important;width:1px;height:1px;margin:-1px;border:0;padding:0;overflow:hidden;clip:rect(0 0 0 0)}
      #selectedPackageBadge .value{cursor:pointer;text-decoration:underline dotted;}
    `;
    const style = document.createElement('style');
    style.id = 'wl-validate-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function iconFor(type){ return type === 'success' ? '✓' : '⚠'; }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function toast(msg, type='info') {
    injectStylesOnce();
    let holder = document.getElementById('wl-toast-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'wl-toast-holder';
      holder.className = 'wl-toast-holder';
      holder.setAttribute('aria-live','polite');
      holder.setAttribute('aria-atomic','true');
      document.body.appendChild(holder);
    }
    const el = document.createElement('div');
    el.className = `wl-toast wl-toast--${type}`;
    el.setAttribute('role','alert');
    el.innerHTML = `<span class="wl-toast__icon">${iconFor(type)}</span><span class="wl-toast__text">${escapeHtml(msg)}</span>`;
    holder.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
    const timer  = setTimeout(remove, 4200);
    el.addEventListener('click', () => { clearTimeout(timer); remove(); }, { once:true });
  }

  function focusAndFlash(el) {
    if (!el) return;
    el.classList.add('wl-field-attn');
    el.focus({ preventScroll:true });
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(() => el.classList.remove('wl-field-attn'), 1800);
  }

  // --------- Модали: „пакет е задължителен“ / „успешно изпратено“ ---------

  function showPkgRequiredModal() {
    injectStylesOnce();
    if (document.getElementById('wl-pkgreq-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'wl-pkgreq-overlay';
    overlay.className = 'wl-modal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Избор на пакет е задължителен');
    overlay.innerHTML = `
      <a href="#" class="wl-visually-hidden" id="wl-first-focus">.</a>
      <div class="wl-modal" role="document">
        <div class="wl-modal__header">
          <h3 class="wl-modal__title">Избери пакет ✶</h3>
          <button type="button" class="wl-modal__close" aria-label="Затвори" title="Затвори">×</button>
        </div>
        <div class="wl-modal__body">
          <p class="lead">Преди да изпратиш запитването, избери пакет от секцията „Пакети“.</p>
          <p class="opacity-75">Така ще можем да дадем точен ориентир и идея за твоя празник.</p>
        </div>
        <div class="wl-modal__footer" style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.08)">
          <button type="button" class="wl-btn" id="wl-cancel">Откажи</button>
          <button type="button" class="wl-btn wl-btn--gold" id="wl-goto-packages">Виж пакетите</button>
        </div>
      </div>
      <a href="#" class="wl-visually-hidden" id="wl-last-focus">.</a>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.wl-modal__close').addEventListener('click', close);
    overlay.querySelector('#wl-cancel').addEventListener('click', close);
    overlay.querySelector('#wl-goto-packages').addEventListener('click', () => {
      close();
      if (typeof window.scrollToWithOffset === 'function') window.scrollToWithOffset('#packages');
      else document.querySelector('#packages')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });

    document.addEventListener('keydown', function onKey(e){
      if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', onKey); }
    });
    const first = overlay.querySelector('#wl-first-focus');
    const last  = overlay.querySelector('#wl-last-focus');
    const primaryBtn = overlay.querySelector('#wl-goto-packages');
    first.addEventListener('focus', () => primaryBtn.focus());
    last.addEventListener('focus',  () => primaryBtn.focus());
    primaryBtn.focus();
  }

  function showSuccessModal() {
    injectStylesOnce();
    if (document.getElementById('wl-success-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'wl-success-overlay';
    overlay.className = 'wl-modal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Успешно изпратено запитване');
    overlay.innerHTML = `
      <a href="#" class="wl-visually-hidden" id="wl-first-focus">.</a>
      <div class="wl-modal" role="document">
        <div class="wl-modal__header">
          <h3 class="wl-modal__title">Благодарим ви! ✨</h3>
          <button type="button" class="wl-modal__close" aria-label="Затвори" title="Затвори">×</button>
        </div>
        <div class="wl-modal__body">
          <p class="lead">Вашата вълшебна заявка е получена успешно.</p>
          <p>Ще се свържем с вас в рамките на <strong>24 часа</strong> с идея и ориентир.</p>
        </div>
        <div class="wl-modal__footer" style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.08)">
          <button type="button" class="wl-btn wl-btn--gold" id="wl-close-btn">Ок</button>
        </div>
      </div>
      <a href="#" class="wl-visually-hidden" id="wl-last-focus">.</a>
    `;
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.wl-modal__close').addEventListener('click', close);
    overlay.querySelector('#wl-close-btn').addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e){
      if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', onKey); }
    });
    const first = overlay.querySelector('#wl-first-focus');
    const last  = overlay.querySelector('#wl-last-focus');
    first.addEventListener('focus', () => overlay.querySelector('#wl-close-btn').focus());
    last.addEventListener('focus',  () => overlay.querySelector('#wl-close-btn').focus());
    overlay.querySelector('#wl-close-btn').focus();
  }

  // --------- Бейдж: бърза редакция на избран пакет ---------

  function scrollToPackages(){
    if (typeof window.scrollToWithOffset === 'function') window.scrollToWithOffset('#packages');
    else document.querySelector('#packages')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  async function openPackageEditorFromBadge(){
    if (!selectedPackageMeta || !selectedPackageMeta.model?.name){
      toast('Няма избран пакет за редакция.', 'warning');
      return scrollToPackages();
    }
    const model = findPackageModelByName(selectedPackageMeta.model.name);
    if (!model){
      toast('Не откривам модела на пакета. Моля, избери отново.', 'warning');
      return scrollToPackages();
    }
    if (typeof window.renderPackageOverlay === 'function'){
      window.renderPackageOverlay(model);
    } else {
      return scrollToPackages();
    }
    requestAnimationFrame(() => {
      const overlay = document.getElementById('package-overlay') || document;
      const tierLabel = selectedPackageMeta.choice?.label || '';
      const sel = overlay.querySelector('#pkgTier');
      if (sel && Array.isArray(model.tiers)){
        const idx = model.tiers.findIndex(t => String(t.label||'').trim() === tierLabel.trim());
        if (idx >= 0){
          sel.value = String(idx);
          sel.dispatchEvent(new Event('change', { bubbles:true }));
        }
      }
      const picked = Array.isArray(selectedPackageMeta.addonsPicked) ? selectedPackageMeta.addonsPicked.map(a => a.label.trim()) : [];
      if (picked.length){
        overlay.querySelectorAll('#pkgAddonsList .pkg-addon').forEach(row => {
          const lbl = (row.querySelector('span')?.textContent || '').trim();
          const cb  = row.querySelector('input[type="checkbox"]');
          if (cb && picked.includes(lbl)){ cb.checked = true; }
        });
        overlay.querySelector('#pkgAddonsList')?.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
  }

  if (pkgBadge){
    const valueEl = pkgBadge.querySelector('.value');
    if (valueEl){
      valueEl.setAttribute('title', 'Редактирай избрания пакет');
      valueEl.style.cursor = 'pointer';
      valueEl.addEventListener('click', (e) => { e.preventDefault(); openPackageEditorFromBadge(); });
    }
    pkgBadge.addEventListener('click', (e) => {
      if (e.target.closest('.clear')) return;
      if (e.target.closest('.value')) return;
      openPackageEditorFromBadge();
    });
  }

  // --------- Изпращане през EmailJS ---------

  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()); }
  let allowProceedOnce = false;

  async function doSend(params){
    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Изпращаме...';
    try {
      const SERVICE_ID  = 'service_xr5w4ro';
      const TEMPLATE_ID = 'template_83xdbvh';
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
      markSent();
      form.reset();
      document.getElementById('selectedPackageBadge')?.classList.add('d-none');
      showSuccessModal();
      extraWrap.innerHTML = '';
      if (eventTypeSel) eventTypeSel.value = '';
    } catch (err) {
      console.error(err);
      toast('Упс! Нещо се обърка. Опитай пак или звънни по телефон.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
      allowProceedOnce = false;
    }
  }

  function showPreSubmitMismatchModal(mismatch, onProceed, onAdjust){
    injectStylesOnce();
    if (document.getElementById('wl-presubmit-mismatch')) return;

    const overlay = document.createElement('div');
    overlay.id = 'wl-presubmit-mismatch';
    overlay.className = 'wl-modal-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML = `
      <a href="#" class="wl-visually-hidden" id="wl-first-focus">.</a>
      <div class="wl-modal" role="document">
        <div class="wl-modal__header">
          <h3 class="wl-modal__title">Провери пакета</h3>
          <button type="button" class="wl-modal__close" aria-label="Затвори" title="Затвори">×</button>
        </div>
        <div class="wl-modal__body">
          <p class="lead">Броят деца е над капацитета на избрания размер.</p>
          <p class="opacity-75">Можем да отворим детайлите и да предложим по-голям tier, за да видиш актуална цена.</p>
        </div>
        <div class="wl-modal__footer" style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,.08)">
          <button type="button" class="wl-btn" id="wl-send-anyway">Изпрати въпреки това</button>
          <button type="button" class="wl-btn wl-btn--gold" id="wl-open-overlay">Промени пакета</button>
        </div>
      </div>
      <a href="#" class="wl-visually-hidden" id="wl-last-focus">.</a>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.wl-modal__close').addEventListener('click', close);
    overlay.querySelector('#wl-send-anyway').addEventListener('click', () => { close(); onProceed && onProceed(); });
    overlay.querySelector('#wl-open-overlay').addEventListener('click', () => { close(); onAdjust && onAdjust(); });

    const first = overlay.querySelector('#wl-first-focus');
    const last  = overlay.querySelector('#wl-last-focus');
    const primaryBtn = overlay.querySelector('#wl-open-overlay');
    first.addEventListener('focus', () => primaryBtn.focus());
    last.addEventListener('focus',  () => primaryBtn.focus());
    primaryBtn.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const hp = document.getElementById('hp');
    if (hp && hp.value.trim()) return;

    if (!packageChosen()) { showPkgRequiredModal(); return; }
    if (!canSend()) { toast('Моля, опитай отново след малко.', 'warning'); return; }

    const fd = new FormData(form);
    const name    = String(fd.get('name')||'').trim();
    const email   = String(fd.get('email')||'').trim();
    const dateVal = String(fd.get('date')||'').trim();
    const timeVal = String(fd.get('time')||'').trim();
    const phone   = String(fd.get('phone')||'').trim();
    const message = String(fd.get('message')||'').trim();

    const eventType = String(fd.get('eventType')||'').trim();
    const childName = String(fd.get('childName')||'').trim();
    const age       = String(fd.get('age')||'').trim();
    const kids      = String(fd.get('kids')||'').trim();
    const theme     = String(fd.get('theme')||'').trim();
    const decor     = String(fd.get('decor')||'').trim();
    const ageMix    = String(fd.get('ageMix')||'').trim();
    const guests    = String(fd.get('guests')||'').trim();
    const school    = String(fd.get('school')||'').trim();
    const graduates = String(fd.get('graduates')||'').trim();
    const guestType = String(fd.get('guestType')||'').trim();

    if (!name || name.length < 2) { toast('Моля, въведи име (мин. 2 символа).', 'warning'); return focusAndFlash(form.elements['name']); }
    const phoneDigits = (phone || '').replace(/[^\d+]/g, '');
    if (!phoneDigits || phoneDigits.length < 7) { toast('Моля, въведи валиден телефон.', 'warning'); return focusAndFlash(form.elements['phone']); }
    if (email && !isEmail(email)) { toast('Имейлът не изглежда валиден.', 'warning'); return focusAndFlash(form.elements['email']); }
    if (!dateVal) { toast('Моля, избери дата.', 'warning'); return focusAndFlash(form.elements['date']); }
    const minDate = new Date(dateField.min);
    const d = new Date(dateVal);
    if (isFinite(d) && d < minDate) { toast('Моля, избери валидна бъдеща дата.', 'warning'); return focusAndFlash(form.elements['date']); }
    if (!timeVal) { toast('Моля, въведи час.', 'warning'); return focusAndFlash(form.elements['time']); }
    if (!eventType) { toast('Избери тип събитие.', 'warning'); return focusAndFlash(form.elements['eventType']); }

    const mismatch = checkKidsTierMismatch();
    if (mismatch && !allowProceedOnce){
      showPreSubmitMismatchModal(
        mismatch,
        () => { allowProceedOnce = true; form.requestSubmit(); },
        () => openOverlayPreselectTier(mismatch.model, mismatch.targetIdx)
      );
      return;
    }

    const pkg = selectedPackageMeta;
    const flatPkg = pkg ? {
      selected_package_name:     pkg.model?.name || '—',
      selected_package_tier:     pkg.choice?.label || '—',
      selected_package_total:    (pkg.total ?? '') === '' ? '—' : String(pkg.total),
      selected_package_currency: pkg.currency || 'лв',
      selected_package_addons:   (Array.isArray(pkg.addonsPicked) && pkg.addonsPicked.length)
                                   ? pkg.addonsPicked.map(a => {
                                       const p = Number(a.price||0);
                                       return p ? `${a.label} (+${p} ${pkg.currency||'лв'})` : a.label;
                                     }).join(', ')
                                   : '—',
      selected_package_summary:  pkg.summaryText || (packageField?.value || '—')
    } : {
      selected_package_name: '—',
      selected_package_tier: '—',
      selected_package_total: '—',
      selected_package_currency: 'лв',
      selected_package_addons: '—',
      selected_package_summary: packageField?.value || '—'
    };

    const EVENT_TYPE_LABEL = {
      birthday:   'Рожден ден',
      christmas:  'Коледно парти',
      graduation: 'Парти за завършване',
      private:    'Частно събитие'
    };

    const eventRows = [];
    if (eventType) eventRows.push(['Тип събитие', EVENT_TYPE_LABEL[eventType] || eventType]);
    eventRows.push(['Час', timeVal]);

    if (eventType === 'birthday') {
      if (childName) eventRows.push(['Име на детето', childName]);
      if (age)       eventRows.push(['Години', age]);
      if (kids)      eventRows.push(['Брой деца', kids]);
      if (theme)     eventRows.push(['Тема', theme]);
    }
    if (eventType === 'christmas') {
      if (decor)  eventRows.push(['Декорация', decor]);
      if (ageMix) eventRows.push(['Възрастов състав', ageMix]);
      if (guests) eventRows.push(['Приблизителен брой гости', guests]);
    }
    if (eventType === 'graduation') {
      if (school)     eventRows.push(['Детска градина / Училище', school]);
      if (graduates)  eventRows.push(['Брой завършващи', graduates]);
    }
    if (eventType === 'private') {
      if (guests)    eventRows.push(['Брой гости', guests]);
      if (guestType) eventRows.push(['Вид на гостите', guestType]);
    }

    const event_details_html = eventRows.length
      ? `<table role="presentation" cellpadding="6" cellspacing="0" border="0" style="font-size:14px; width:100%; max-width:640px;">
          <tbody>
            ${eventRows.map(([k,v]) => `
              <tr>
                <td style="font-weight:bold; width:220px;">${k}:</td>
                <td>${String(v).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      : '<div style="color:#6b7280;">(няма допълнителни детайли)</div>';

    const params = {
      from_name:   name,
      from_email:  email || '-',
      event_date:  dateVal,
      event_time:  timeVal,
      phone:       phone,
      message:     message || '-',
      package:     packageField?.value || '-',
      event_type:  eventType || '-',
      child_name:  childName || '-',
      age:         age || '-',
      kids:        kids || '-',
      theme:       theme || '-',
      decor:       decor || '-',
      age_mix:     ageMix || '-',
      guests:      guests || '-',
      school:      school || '-',
      graduates:   graduates || '-',
      guest_type:  guestType || '-',
      event_details_html,
      selected_package_details: pkg ? JSON.stringify({
        name: pkg.model?.name || '',
        tier: pkg.choice?.label || '',
        total: pkg.total ?? null,
        currency: pkg.currency || 'лв',
        addons: (pkg.addonsPicked||[]).map(a => ({ label: a.label, price: Number(a.price||0) }))
      }) : '-',
      ...flatPkg
    };

    await doSend(params);
  });

  // --------- Адаптивно скалиране на формата на десктоп ---------

  /**
   * Скалира формата на ≥992px ширина, така че бутонът „Изпрати“ да остане в екран.
   * Минимален мащаб 0.6 за четимост.
   */
  function scaleFormIfNecessary() {
    if (window.innerWidth < 992) {
      form.style.transform = '';
      return;
    }
    const formHeight    = form.scrollHeight + 250; // буфер
    const windowHeight  = window.innerHeight;
    const requiredSpace = windowHeight * 0.8;

    if (formHeight > requiredSpace) {
      let scale = requiredSpace / formHeight;
      scale = Math.max(0.6, scale);
      form.style.transition = 'transform 0.3s ease-in-out';
      form.style.transform = `scale(${scale})`;
      form.style.transformOrigin = 'top center';
    } else {
      form.style.transform = '';
    }
  }

  window.addEventListener('resize', scaleFormIfNecessary);
  eventTypeSel?.addEventListener('change', () => {
    renderExtraFields(eventTypeSel.value);
    requestAnimationFrame(scaleFormIfNecessary);
  });
  document.addEventListener('wl:package-selected', (e) => {
    selectedPackageMeta = e?.detail || null;
    prefillFromPackageIfPossible();
    requestAnimationFrame(scaleFormIfNecessary);
  });
})();
