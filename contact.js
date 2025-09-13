/**
 * contact.js — изпращане на форма за запитване + UX помощници + динамични полета.
 *
 */

(() => {
  const form         = document.getElementById('contactForm');
  const submitBtn    = form.querySelector('button[type="submit"]');
  const packageField = document.getElementById('packageField');
  const pkgBadge     = document.getElementById('selectedPackageBadge');
  const dateField    = document.getElementById('dateField');

  /** ===== Дата: минимално допустима е днес ===== */
  const today = new Date();
  dateField.min = [
    today.getFullYear(),
    String(today.getMonth()+1).padStart(2,'0'),
    String(today.getDate()).padStart(2,'0')
  ].join('-');

  /** ===== Anti-spam (30s между изпращанията) ===== */
  const canSend  = () => Date.now() - (Number(localStorage.getItem('contact_last_send')||0)) > 30_000;
  const markSent = () => localStorage.setItem('contact_last_send', String(Date.now()));

  /** ===== Пакет: избран/изчистване ===== */
  const packageChosen = () => (packageField?.value || '').trim().length > 0;
  pkgBadge?.querySelector('.clear')?.addEventListener('click', () => {
    if (!packageField) return;
    packageField.value = '';
    packageField.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /** ===== Динамични полета по „Тип събитие“ ===== */
  const eventTypeSel = document.getElementById('eventType');
  const extraWrap    = document.getElementById('eventExtraFields');

  const templates = {
    birthday: () => `
      <div class="row gy-1">
        <div class="col-md-3">
          <label class="form-label">Възраст на рожденика</label>
          <input type="number" name="age" class="form-control" min="1" max="120" placeholder="7">
        </div>
        <div class="col-md-3">
          <label class="form-label">Брой деца</label>
          <input type="number" name="kids" class="form-control" min="1" placeholder="10">
        </div>
        <div class="col-md-3">
          <label class="form-label">Тема (по желание)</label>
          <input type="text" name="theme" class="form-control" placeholder="Принцеси, Космос…">
        </div>
        <div class="col-md-3">
          <label class="form-label">Бюджет (по желание)</label>
          <input type="text" name="budget" class="form-control" inputmode="decimal" placeholder="напр. 350">
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
          <label class="form-label">Бюджет (по желание)</label>
          <input type="text" name="budget" class="form-control" inputmode="decimal" placeholder="напр. 500">
        </div>
      </div>
    `,
    graduation: () => `
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">Училище/Университет</label>
          <input type="text" name="school" class="form-control" placeholder="СУ „...“">
        </div>
        <div class="col-md-3">
          <label class="form-label">Брой завършващи</label>
          <input type="number" name="graduates" class="form-control" min="1" placeholder="напр. 8">
        </div>
        <div class="col-md-3">
          <label class="form-label">Фото/видео кът</label>
          <select name="photoCorner" class="form-select">
            <option value="Да">Да</option>
            <option value="Не">Не</option>
            <option value="По преценка">По преценка</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Бюджет (по желание)</label>
          <input type="text" name="budget" class="form-control" inputmode="decimal" placeholder="напр. 600">
        </div>
      </div>
    `,
    private: () => `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Характер на събитието</label>
          <input type="text" name="privateType" class="form-control" placeholder="Юбилей, коктейл…">
        </div>
        <div class="col-md-6">
          <label class="form-label">Бюджет (по желание)</label>
          <input type="text" name="budget" class="form-control" inputmode="decimal" placeholder="напр. 700">
        </div>
      </div>
    `
  };

  function prefillFromPackageIfPossible() {
    // 1) ако имаме meta от packages.js
    if (selectedPackageMeta) {
      const kidsInput   = form.querySelector('input[name="kids"]');
      const budgetInput = form.querySelector('input[name="budget"]');

      // kids от tier етикета (напр. "до 12 деца")
      if (kidsInput && selectedPackageMeta.choice?.label) {
        const nums = (selectedPackageMeta.choice.label.match(/\d+/g) || []).map(Number).filter(Number.isFinite);
        if (nums.length && !kidsInput.value) kidsInput.value = String(Math.max(...nums));
      }
      // бюджет от total
      if (budgetInput && Number.isFinite(selectedPackageMeta.total) && !budgetInput.value) {
        budgetInput.value = String(selectedPackageMeta.total);
      }
      return;
    }
    // 2) fallback от скрити полета, ако meta още не е дошъл
    const tierLabel = (document.getElementById('pkgTierLabel')?.value || '').trim();
    const total     = Number(document.getElementById('pkgTotal')?.value || '');
    const kidsInput = form.querySelector('input[name="kids"]');
    const budgetInp = form.querySelector('input[name="budget"]');
    if (kidsInput && tierLabel) {
      const nums = (tierLabel.match(/\d+/g) || []).map(Number).filter(Number.isFinite);
      if (nums.length && !kidsInput.value) kidsInput.value = String(Math.max(...nums));
    }
    if (budgetInp && Number.isFinite(total) && !budgetInp.value) {
      budgetInp.value = String(total);
    }
  }

  function renderExtraFields(type) {
    extraWrap.innerHTML = templates[type]?.() || '';
    // след като инжектираме DOM-а, опитай да префилнеш
    prefillFromPackageIfPossible();
    // вържи слушател за "Брой деца" (ако съществува)
    bindKidsWatcher();
  }

  eventTypeSel?.addEventListener('change', () => renderExtraFields(eventTypeSel.value));
  // не натоварваме при първо зареждане – показва полета едва след избор

  /**
   * ===== Приемане на детайли за избрания пакет =====
   * packages.js диспатчва: 'wl:package-selected'
   */
  let selectedPackageMeta = null;
  document.addEventListener('wl:package-selected', (e) => {
    selectedPackageMeta = e?.detail || null;
    // ако вече има рендерирани полета — обнови префила
    prefillFromPackageIfPossible();
  });

  /** ====================== NEW: Проверка на капацитета спрямо "Брой деца" ====================== */

  // намери модел по име от window.PACKAGES
  function findPackageModelByName(name){
    const list = (window.PACKAGES && Array.isArray(window.PACKAGES.packages)) ? window.PACKAGES.packages : [];
    return list.find(p => String(p.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase()) || null;
  }

  // извади максимален капацитет от етикет на tier (взимаме най-голямото число)
  function capacityFromTierLabel(label){
    const nums = (String(label||'').match(/\d+/g) || []).map(Number).filter(Number.isFinite);
    return nums.length ? Math.max(...nums) : null;
  }

  // първият tier, който побира дадения брой деца; ако няма числа в tier-овете → null
  function findTierIndexForKids(model, kids){
    if (!model || !Array.isArray(model.tiers) || !model.tiers.length) return null;
    const caps = model.tiers.map(t => capacityFromTierLabel(t.label));
    if (caps.every(v => v == null)) return null; // няма числа за сравнение
    for (let i=0;i<model.tiers.length;i++){
      const cap = caps[i];
      if (cap == null) continue;
      if (kids <= cap) return i;
    }
    // ако всички капаци са по-малки, върни последния индекс (най-големия tier)
    let lastIdx = -1;
    let bestCap = -Infinity;
    caps.forEach((c, i) => { if (c != null && c > bestCap){ bestCap = c; lastIdx = i; }});
    return lastIdx >= 0 ? lastIdx : null;
  }

  // индексът на текущия tier по етикет
  function currentTierIndex(model, tierLabel){
    if (!model || !Array.isArray(model.tiers)) return null;
    const idx = model.tiers.findIndex(t => String(t.label||'').trim() === String(tierLabel||'').trim());
    return idx >= 0 ? idx : null;
  }

  // отвори детайлите и предварително избери targetIdx
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

  // модал за несъответствие
  function showTierMismatchModal({model, targetIdx, currentIdx}){
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
          <p>Предлагаме да прегледаме по-голям размер (следващ tier), за да видиш актуална ориентировъчна цена.</p>
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
    overlay.querySelector('#wl-adjust').addEventListener('click', () => {
      close();
      openOverlayPreselectTier(model, targetIdx);
    });

    const first = overlay.querySelector('#wl-first-focus');
    const last  = overlay.querySelector('#wl-last-focus');
    const primaryBtn = overlay.querySelector('#wl-adjust');
    first.addEventListener('focus', () => primaryBtn.focus());
    last.addEventListener('focus',  () => primaryBtn.focus());
    primaryBtn.focus();
  }

  // проверка за несъответствие (връща обект с данни или null)
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

    if (targetIdx > curIdx) {
      return { model, currentIdx: curIdx, targetIdx };
    }
    return null;
  }

  // вържи watcher към полето "kids"
  function bindKidsWatcher(){
    const kidsInput = form.querySelector('input[name="kids"]');
    if (!kidsInput) return;

    let t = 0;
    const onCheck = () => {
      const mismatch = checkKidsTierMismatch();
      if (mismatch) {
        showTierMismatchModal(mismatch);
      }
    };
    kidsInput.removeEventListener('input', kidsInput.__wlKidsHandler || (()=>{}));
    kidsInput.__wlKidsHandler = () => { clearTimeout(t); t = setTimeout(onCheck, 350); };
    kidsInput.addEventListener('input', kidsInput.__wlKidsHandler);
  }

  /** ===== Стилове за toast / модали (инжектират се еднократно) ===== */
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

  /** ===== Toast помощници ===== */
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

  /** ===== Фокус + кратък акцент върху поле ===== */
  function focusAndFlash(el) {
    if (!el) return;
    el.classList.add('wl-field-attn');
    el.focus({ preventScroll:true });
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(() => el.classList.remove('wl-field-attn'), 1800);
  }

  /** ===== Модал: изисква се избор на пакет ===== */
  function showPkgRequiredModal() {
    injectStylesOnce();
    if (document.getElementById('wl-pkgreq-overlay')) return;

    document.body.classList.add('no-scroll');
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

    const close = () => { overlay.remove(); document.body.classList.remove('no-scroll'); };
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

  /** ===== Модал: успешно изпратено ===== */
  function showSuccessModal() {
    injectStylesOnce();
    if (document.getElementById('wl-success-overlay')) return;

    document.body.classList.add('no-scroll');
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

    const close = () => { overlay.remove(); document.body.classList.remove('no-scroll'); };
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

  /** ===== Редакция на избрания пакет (клик върху бейджа) ===== */
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
          if (cb && picked.includes(lbl)){
            cb.checked = true;
          }
        });
        overlay.querySelector('#pkgAddonsList')?.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
  }

  // направи бейджа кликаем (освен бутона „×“)
  if (pkgBadge){
    const valueEl = pkgBadge.querySelector('.value');
    if (valueEl){
      valueEl.setAttribute('title', 'Редактирай избрания пакет');
      valueEl.style.cursor = 'pointer';
      valueEl.addEventListener('click', (e) => {
        e.preventDefault();
        openPackageEditorFromBadge();
      });
    }
    // клик по празно място в бейджа – също редакция
    pkgBadge.addEventListener('click', (e) => {
      if (e.target.closest('.clear')) return;
      if (e.target.closest('.value')) return;
      openPackageEditorFromBadge();
    });
  }

  /** ===== Submit: валидация и изпращане през EmailJS ===== */
  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()); }

  // позволи еднократно изпращане „въпреки несъответствието“
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
      const badge = document.getElementById('selectedPackageBadge');
      if (badge) badge.classList.add('d-none');
      showSuccessModal();
      // изчисти и динамичните полета
      extraWrap.innerHTML = '';
      if (eventTypeSel) eventTypeSel.value = '';
    } catch (err) {
      console.error(err);
      toast('Упс! Нещо се обърка. Опитай пак или звънни по телефон.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
      allowProceedOnce = false; // рестарт на флага
    }
  }

  // модал преди изпращане, ако има несъответствие
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

    // honeypot
    const hp = document.getElementById('hp');
    if (hp && hp.value.trim()) return;

    if (!packageChosen()) { showPkgRequiredModal(); return; }
    if (!canSend()) { toast('Моля, опитай отново след малко.', 'warning'); return; }

    const fd = new FormData(form);
    const name    = String(fd.get('name')||'').trim();
    const email   = String(fd.get('email')||'').trim();
    const dateVal = String(fd.get('date')||'').trim();
    const phone   = String(fd.get('phone')||'').trim();
    const message = String(fd.get('message')||'').trim();

    // динамични стойности (може и да липсват)
    const eventType   = String(fd.get('eventType')||'').trim();
    const age         = String(fd.get('age')||'').trim();
    const kids        = String(fd.get('kids')||'').trim();
    const theme       = String(fd.get('theme')||'').trim();
    const budget      = String(fd.get('budget')||'').trim();
    const decor       = String(fd.get('decor')||'').trim();
    const ageMix      = String(fd.get('ageMix')||'').trim();
    const school      = String(fd.get('school')||'').trim();
    const graduates   = String(fd.get('graduates')||'').trim();
    const photoCorner = String(fd.get('photoCorner')||'').trim();
    const privateType = String(fd.get('privateType')||'').trim();

    // проверки
    if (!name || name.length < 2) { toast('Моля, въведи име (мин. 2 символа).', 'warning'); return focusAndFlash(form.elements['name']); }
    if (!email || !isEmail(email)) { toast('Моля, въведи валиден имейл.', 'warning'); return focusAndFlash(form.elements['email']); }
    if (!dateVal) { toast('Моля, избери дата.', 'warning'); return focusAndFlash(form.elements['date']); }
    const minDate = new Date(dateField.min);
    const d       = new Date(dateVal);
    if (isFinite(d) && d < minDate) { toast('Моля, избери валидна бъдеща дата.', 'warning'); return focusAndFlash(form.elements['date']); }
    if (!eventType) { toast('Избери тип събитие.', 'warning'); return focusAndFlash(form.elements['eventType']); }
    if (!message || message.length < 8) { toast('Моля, опиши събитието накратко (мин. 8 символа).', 'warning'); return focusAndFlash(form.elements['message']); }

    // преди изпращане: ако kids > капацитет → предложи промяна
    const mismatch = checkKidsTierMismatch();
    if (mismatch && !allowProceedOnce){
      showPreSubmitMismatchModal(
        mismatch,
        // proceed anyway
        () => { allowProceedOnce = true; form.requestSubmit(); },
        // adjust: отвори оувърлей и избери предложения tier
        () => openOverlayPreselectTier(mismatch.model, mismatch.targetIdx)
      );
      return;
    }

    // параметри за EmailJS
    const pkg = selectedPackageMeta; // идва от събитието wl:package-selected

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

    // --- Хелпър: показваме само попълнените стойности в имейла ---
    const EVENT_TYPE_LABEL = {
      birthday:   'Рожден ден',
      christmas:  'Коледно парти',
      graduation: 'Парти за завършване',
      private:    'Частно събитие'
    };

    function fmtMoneyLike(v) {
      const n = Number(String(v).replace(',', '.'));
      if (!Number.isFinite(n)) return String(v);
      return new Intl.NumberFormat('bg-BG').format(n);
    }

    // събери „само попълненото“ според типа събитие
    const eventRows = [];

    if (eventType) {
      eventRows.push(['Тип събитие', EVENT_TYPE_LABEL[eventType] || eventType]);
    }

    if (eventType === 'birthday') {
      if (age)    eventRows.push(['Възраст на рожденика', age]);
      if (kids)   eventRows.push(['Брой деца', kids]);
      if (theme)  eventRows.push(['Тема', theme]);
      if (budget) eventRows.push(['Бюджет (ориентир)', fmtMoneyLike(budget) + ' лв']);
    }

    if (eventType === 'christmas') {
      if (decor)  eventRows.push(['Декорация', decor]);
      if (ageMix) eventRows.push(['Възрастов състав', ageMix]);
      if (budget) eventRows.push(['Бюджет (ориентир)', fmtMoneyLike(budget) + ' лв']);
    }

    if (eventType === 'graduation') {
      if (school)     eventRows.push(['Училище/Университет', school]);
      if (graduates)  eventRows.push(['Брой завършващи', graduates]);
      if (photoCorner)eventRows.push(['Фото/видео кът', photoCorner]);
      if (budget)     eventRows.push(['Бюджет (ориентир)', fmtMoneyLike(budget) + ' лв']);
    }

    if (eventType === 'private') {
      if (privateType) eventRows.push(['Характер на събитието', privateType]);
      if (budget)      eventRows.push(['Бюджет (ориентир)', fmtMoneyLike(budget) + ' лв']);
    }

    // финален HTML за вмъкване в темплейта
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
      from_email:  email,
      event_date:  dateVal,
      phone:       phone || '-',
      message,
      package:     packageField?.value || '-',

      // нови полета за типа събитие
      event_details_html,
      event_type:  eventType || '-',
      age:         age || '-',
      kids:        kids || '-',
      theme:       theme || '-',
      budget:      budget || '-',
      decor:       decor || '-',
      age_mix:     ageMix || '-',
      school:      school || '-',
      graduates:   graduates || '-',
      photo_corner:photoCorner || '-',
      private_type:privateType || '-',

      // подробни детайли (JSON) — по избор за дебъг/архив
      selected_package_details: pkg ? JSON.stringify({
        name: pkg.model?.name || '',
        tier: pkg.choice?.label || '',
        total: pkg.total ?? null,
        currency: pkg.currency || 'лв',
        addons: (pkg.addonsPicked||[]).map(a => ({ label: a.label, price: Number(a.price||0) }))
      }) : '-',

      // плоските полета, които темплейтът рендва
      ...flatPkg
    };

//    console.log('[EmailJS params]', params);

    await doSend(params);
  });
})();
