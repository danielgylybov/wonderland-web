/* invite.js — A4 PDF download (без preview), тъмна/светла тема, дълъг магически текст */
(function () {
  const form        = document.getElementById('inviteForm');
  const themeSwitch = document.getElementById('inviteThemeSwitch');
  const downloadBtn = document.getElementById('inviteDownloadBtn');
  const resetBtn    = document.getElementById('inviteResetBtn');
  if (!form || !downloadBtn) return;

  // --- Дата (BG) ---
  const months = ['януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември'];
  const fmtDate = (ds, ts) => {
    if (!ds) return '';
    const dt = new Date(ds + 'T' + (ts || '00:00'));
    if (Number.isNaN(dt.getTime())) return '';
    const t = ts ? `, ${ts.slice(0,5)}` : '';
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()} г${t}`;
  };

  // Дефолтни дата/час
  (function initDefaults(){
    const fd = form.querySelector('input[name="date"]');
    const ft = form.querySelector('input[name="time"]');
    const now = new Date();
    if (fd && !fd.value) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth()+1).padStart(2,'0');
      const dd = String(now.getDate()).padStart(2,'0');
      fd.value = `${yyyy}-${mm}-${dd}`;
    }
    if (ft && !ft.value) {
      const mins = Math.ceil(now.getMinutes()/30)*30;
      if (mins === 60){ now.setHours(now.getHours()+1); now.setMinutes(0); }
      else { now.setMinutes(mins); }
      const hh = String(now.getHours()).padStart(2,'0');
      const mi = String(now.getMinutes()).padStart(2,'0');
      ft.value = `${hh}:${mi}`;
    }
  })();

  // --- Helpers за звездите и логото ---
  function seededRndFactory(seedStr){
    let s = 0; for (let i=0;i<seedStr.length;i++) s = (s*31 + seedStr.charCodeAt(i)) >>> 0;
    return () => (s = (1664525*s + 1013904223) >>> 0) / 2**32;
  }
  function starsSVG({w,h,n,color,minR=1.2,maxR=3.2,seed="*"}){
    const rnd = seededRndFactory(seed);
    let dots = "";
    for (let i=0;i<n;i++){
      const x = Math.round(rnd()*w);
      const y = Math.round(rnd()*h);
      const r = (minR + rnd()*(maxR-minR)).toFixed(2);
      dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.95"/>`;
    }
    return `<svg class="stars stars--full" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`;
  }
  async function inlineBrandSVG(target, url, color){
    if (!target) return;
    const res = await fetch(url);
    let svg = await res.text();
    svg = svg.replace(/fill="[^"]*"/g,'fill="currentColor"')
             .replace(/stroke="[^"]*"/g,'stroke="currentColor"');
    target.style.color = color;
    target.innerHTML = svg;
  }

  // --- Построяване на off-screen A4 сцената ---
function buildStage(data, dark){
  const who      = (data.to || 'Нашия празник').trim();
  const host     = (data.from || 'Сем. Иванови').trim();
  const dateText = fmtDate(data.date, data.time) || 'дата, час';
  const rsvp     = (data.rsvp || '').trim();
  const creative = (data.creative || 'Очаква те приключение с игри, балони и смях! Донеси си усмивка, а ние ще донесем магията ✨').trim();

  const starColor = dark ? '#f1c37a' : '#d89e58';
  const seedStr   = [who, data.date || '', data.time || ''].join('|');

  const wrap = document.createElement('div');
  wrap.className = 'invite-pdf-stage' + (dark ? ' theme-dark' : '');
  wrap.innerHTML = `
    <style>
      .invite-pdf-stage{
        font-family:"CraftworkGrotesk",system-ui;
        --pad:72px;        /* външен бял пас от всички страни */
      }
      .invite-pdf-stage .page{
        position:relative; width:1240px; height:1754px;
        padding:var(--pad); box-sizing:border-box;
        background:#fff; color:#111;
        display:grid; grid-template-rows:auto 1fr; gap:28px;
      }
      .invite-pdf-stage.theme-dark .page{ background:#fff; color:#111 }

      .invite-pdf-stage .card{
        position:relative; width:100%; height:100%;
        border-radius:16px; border:1px solid rgba(0,0,0,.08);
        padding:46px 44px; box-sizing:border-box; background:transparent;
      }

      /* звездният слой (под съдържанието) */
      .invite-pdf-stage .stars--full{ position:absolute; inset:0; z-index:0; pointer-events:none }

      .brand{ position:relative; z-index:2; margin:6px auto 10px; display:block; text-align:center }
      .sub{ position:relative; z-index:2; text-align:center; font-size:28px; opacity:.85; margin-bottom:18px }
      .rule{ position:relative; z-index:2; height:1px; width:100%; background:currentColor; opacity:.18; margin:10px 0 26px }

      .title{ position:relative; z-index:2; font-family:"Rosarium",serif; font-size:64px; color:#d89e58; margin:0 0 12px }
      .text{ position:relative; z-index:2; font-size:26px; line-height:1.55; margin:0 0 10px }
      .note{ position:relative; z-index:2; font-size:24px; line-height:1.5; margin:6px 0 10px }
      b{ font-weight:700 }

      /* EXTRA (магичен блок) */
      .extra.magic{
        position:relative; margin-top:26px; padding:28px 30px 24px;
        border-radius:16px; background:transparent; border:1.5px dashed rgba(216,158,88,.55);
      }
      .extra.magic::after{
        content:""; position:absolute; inset:6px; pointer-events:none; opacity:.35; border-radius:12px;
        background:
          radial-gradient(circle 2px, rgba(216,158,88,.75) 98%, transparent) 6px 10px/90px 90px repeat,
          radial-gradient(circle 1.6px, rgba(174,188,255,.55) 98%, transparent) 42px 28px/120px 120px repeat;
      }
      .extra-title{ text-align:center; margin:-4px 0 12px; font-size:50px; color:#d89e58 }
      .extra-title em{ font-style:normal; font-family:"Rosarium",serif }
      .extra-title span{ margin:0 10px }
      .extra-lead{ margin:0 0 10px 0; font-size:24px; line-height:1.55 }
      .extra-list{ list-style:none; margin:0; padding:0; display:grid; gap:10px; font-size:24px; line-height:1.5 }
      .extra-list li{ position:relative; padding-left:28px }
      .extra-list li::before{ content:"✶"; position:absolute; left:4px; top:.15em; font-size:18px; color:#d89e58 }
    </style>

    <div class="page">
      <div class="card">
        ${starsSVG({ w:1240, h:1754, n:180, color:starColor, minR:1.4, maxR:3.2, seed:seedStr })}
        <div class="brand" id="brandSlot"></div>
        <div class="sub">Вълшебно място за празници</div>
        <div class="rule"></div>

        <div class="title">${who}</div>
        <p class="text">Каним те на <b>${who}</b>! Точно на <b>${dateText}</b> в
          <b>Парти център Wonderland, гр. Смолян</b> ще отворим вратата към Wonderland —
          място, където игрите оживяват, балоните шепнат желания, а смехът звучи като музика.</p>
        <p class="text">${creative}</p>
        <p class="note">Домакини: <b>${host}</b>. ${rsvp ? `Моля, потвърди присъствие на ${rsvp}.` : ''}</p>

        <div class="extra magic">
          <div class="extra-title"><span>✦</span> <em>Пътеводител към чудесата</em> <span>✦</span></div>
          <p class="extra-lead">Пристигни 10 минути по-рано — порталът се отваря навреме, а първите усмивки са най-магични.</p>
          <ul class="extra-list">
            <li><b>Дрескод:</b> цветни мечти и искри в очите</li>
            <li><b>VIP гост:</b> любимата играчка 🧸</li>
            <li><b>Фотокът</b> те чака за снимки и малки изненади ✨</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  wrap.__afterAttach = async () => {
    await inlineBrandSVG(
      wrap.querySelector('#brandSlot'),
      'assets/img/Gold-6-trimmed.svg',
      dark ? '#f1c37a' : '#d89e58'
    );
  };
  return wrap;
}



  // --- Сваляне като PDF ---
  async function downloadPDF(){
    const data = Object.fromEntries(new FormData(form).entries());
    const dark = !!themeSwitch?.checked;

    const stage = buildStage(data, dark);
    document.body.appendChild(stage);
    if (stage.__afterAttach) { try { await stage.__afterAttach(); } catch(_){} }
    if (document.fonts?.ready) { try { await document.fonts.ready; } catch(_){} }

    const canvas = await html2canvas(stage, {
      useCORS: true,
      scale: 2,
      backgroundColor: getComputedStyle(stage).backgroundColor
    });

    document.body.removeChild(stage);

    const img = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.addImage(img, 'JPEG', 0, 0, w, h);

    const safe = (data.to || 'Pokana').replace(/[^\p{L}\p{N}\s_-]+/gu,'').trim().replace(/\s+/g,'-');
    const dateSafe = (data.date || '').replaceAll('-', '');
    pdf.save(`Pokana-${safe || 'Wonderland'}-${dateSafe || 'A4'}.pdf`);
  }

  downloadBtn.addEventListener('click', downloadPDF);
  resetBtn?.addEventListener('click', () => {});
})();
