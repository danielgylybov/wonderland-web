/**
 * Wonderland — генериране на PDF покани върху два темплейта:
 *   - v1: класически (центрирани редове)
 *   - v2: „заек“ (ляво подравняване + индивидуални хор. офсети на всеки ред)
 *
 * Зависимости (зареждат се динамично при нужда):
 *   - pdf-lib (https://unpkg.com/pdf-lib)
 *   - @pdf-lib/fontkit (за TTF/OTF и кирилица)
 *
 * Нужни файлове:
 *   - assets/invite/invite.pdf        (template v1)
 *   - assets/invite/invite_2.pdf      (template v2)
 *   - assets/Rosarium.ttf             (Regular; с кирилица)
 *   - assets/Rosarium.ttf (или Bold)  (Bold/семиболд; при липса – отново Regular)
 *
 * Какво да пипаш най-често:
 *   1) Офсети за v2 (масив OFFSETS_V2_CONTENT) — по един offset за всеки „съдържателен“ ред.
 *      Редовете са 11 (датата е на отделен ред; „Точно в …“ и „{Име} ще навърши …“ са два реда).
 *   2) Размер/цвят/сянка на последния ред във v2 (V2_LASTLINE и логиката в рендъра).
 *      Цветът е #d89e58. Сянката е дискретна (offset 1px, opacity 0.35).
 *   3) Геометрия/типография: startY, maxWidth, fontSize, leading.
 */

(() => {
  /** ---------- Константи и пътища ---------- */
  const form        = document.getElementById('inviteForm');
  const btnDownload = document.getElementById('inviteDownloadBtn');

  const TEMPLATE_URLS = {
    v1: 'assets/invite/invite.pdf',
    v2: 'assets/invite/invite_2.pdf',
  };

  const REGULAR_FONT_URL = 'assets/Rosarium.ttf';
  const BOLD_FONT_URL    = 'assets/Rosarium.ttf'; // ако имаш Rosarium-Bold.ttf – посочи го тук

  /**
   * Режим за офсети при v2:
   *  - 'content': offset по „съдържателен ред“ (преносите споделят офсет) — стабилно и препоръчително
   *  - 'visual' : offset по „визуален ред“ (вкл. преноси)
   */
  const RABBIT_OFFSET_MODE = 'content';
  const DEBUG_INDEX = false; // true → показва индекс на реда в PDF за бърза калибрация

  /** Офсети по съдържателни редове за v2 (11 реда) */
  const OFFSETS_V2_CONTENT = [
    67, // 1: "Време е да се впуснем в"
    78, // 2: "чудна веселба на DD.MM.YYYYг."
    85, // 3: "Точно в {час}"
    108,// 4: "{Име} ще навърши {N}г."
    110,// 5: "Заедно ще отворим тайната"
    110,// 6: "врата място, където игрите оживяват,"
    92, // 7: "балоните шепнат желания, а смехът"
    84, // 8: "звучи, като музика!"
    51, // 9: "Очаква те незабравимо приключение."
    50, // 10:"Донеси си усмивка, а магията е от нас."
    33, // 11:"Очаквам те в Wonderland" (златен, по-голям)
  ];
  const OFFSETS_V2_VISUAL = OFFSETS_V2_CONTENT.slice();

  /** Стил за последния ред във v2: по-голям + златен + лека сянка */
  const V2_LASTLINE = {
    size: 30,
    gold: { r: 216/255, g: 158/255, b: 88/255 }, // #d89e58
    shadow: { offset: 1, opacity: 0.35 }         // деликатна сянка
  };

  /** ---------- Зареждане на pdf-lib и fontkit при нужда ---------- */
  async function ensurePdfLibAndFontkit() {
    async function load(src) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    if (!window.PDFLib)  await load('https://unpkg.com/pdf-lib/dist/pdf-lib.min.js');
    if (!window.fontkit) await load('https://unpkg.com/@pdf-lib/fontkit/dist/fontkit.umd.min.js');
  }

  /** ---------- Форматиране на дата/час ---------- */
  function fmtDateDots(dateStr) {
    try {
      const d = new Date(dateStr);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}.${mm}.${yyyy}г.`;
    } catch { return dateStr || ''; }
  }
  function fmtTime(timeStr) {
    try {
      const [hh, mm] = (timeStr || '').split(':').map(Number);
      const d = new Date();
      d.setHours(hh || 0, mm || 0, 0, 0);
      return d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
    } catch { return timeStr || ''; }
  }

  /** ---------- Малки помощници за рисуване ---------- */

  /** Обща ширина на inline части при даден шрифт/размер */
  function lineWidth(parts, fontSize) {
    return parts.reduce((sum, p) => sum + p.font.widthOfTextAtSize(p.text, fontSize), 0);
  }

  /** Пише малък индекс до реда (за калибрация на офсети) */
  function drawDebugIndex(page, idx, x, y, font, size) {
    if (!DEBUG_INDEX) return;
    const label = `[${idx}]`;
    page.drawText(label, { x: x - font.widthOfTextAtSize(label, size) - 6, y, size, font });
  }

  /**
   * Рисува един inline ред (без пренасяне).
   * @param {PDFPage} page
   * @param {{text:string,font:PDFFont}[]} parts
   * @param {number} y - baseline Y
   * @param {{align:'left'|'center',centerX:number,leftX:number,fontSize:number,color?:RGB,opacity?:number,offsetPx?:number,index?:number,debugFont?:PDFFont}} cfg
   */
  function drawInline(page, parts, y, { align, centerX, leftX, fontSize, color, opacity = 1, offsetPx = 0, index, debugFont }) {
    const total = lineWidth(parts, fontSize);
    let x = align === 'left' ? (leftX + offsetPx) : (centerX - total / 2 + offsetPx);
    if (DEBUG_INDEX && index != null) drawDebugIndex(page, index, x, y, debugFont, Math.max(10, Math.round(fontSize * .42)));
    for (const p of parts) {
      page.drawText(p.text, { x, y, size: fontSize, font: p.font, color, opacity });
      x += p.font.widthOfTextAtSize(p.text, fontSize);
    }
  }

  /**
   * Рисува един plain ред (без пренасяне).
   */
  function drawSingleLine(page, text, y, { align, centerX, leftX, font, fontSize, color, opacity = 1, offsetPx = 0, debugIndex, debugFont }) {
    const wpx = font.widthOfTextAtSize(text, fontSize);
    const x = (align === 'left') ? (leftX + offsetPx) : (centerX - wpx / 2 + offsetPx);
    if (DEBUG_INDEX && debugIndex != null) drawDebugIndex(page, debugIndex, x, y, debugFont, Math.max(10, Math.round(fontSize * .42)));
    page.drawText(text, { x, y, size: fontSize, font, color, opacity });
  }

  /**
   * Wrap + рисуване на plain текст (един „съдържателен“ ред, потенциално на няколко визуални).
   * В режим 'content' всички визуални преноси използват един и същ offset.
   */
  function drawPlain(page, text, y, {
    align, centerX, leftX, maxWidth, lineHeight,
    font, fontSize, color, opacity = 1, getVisualOffset, fixedOffset,
    visualLineCounterRef, debugFont
  }) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? cur + ' ' + w : w;
      const wpx = font.widthOfTextAtSize(candidate, fontSize);
      if (wpx <= maxWidth || !cur) cur = candidate;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);

    let yy = y;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const vIdx = ++visualLineCounterRef.count;
      const off = (fixedOffset != null) ? fixedOffset : getVisualOffset(vIdx);
      let x;
      if (align === 'left') x = leftX + off;
      else {
        const wpx = font.widthOfTextAtSize(ln, fontSize);
        x = centerX - wpx / 2 + off;
      }
      if (DEBUG_INDEX) drawDebugIndex(page, vIdx, x, yy, debugFont, Math.max(10, Math.round(fontSize * .42)));
      page.drawText(ln, { x, y: yy, size: fontSize, font, color, opacity });
      yy -= lineHeight;
    }
    return yy;
  }

  /** ---------- Съдържание по редове ---------- */
  function buildLines(fonts, values) {
    const dateInline = `чудна веселба на ${fmtDateDots(values.date)}`;
    return [
      { type: 'plain',        text: 'Време е да се впуснем в' },
      { type: 'single-line',  text: dateInline },
      { type: 'inline-dynamic', key: 'whenNameAge' }, // v1: един ред; v2: два реда
      { type: 'plain',        text: 'Заедно ще отворим тайната' },
      { type: 'plain',        text: 'врата място, където игрите оживяват,' },
      { type: 'plain',        text: 'балоните шепнат желания, а смехът' },
      { type: 'plain',        text: 'звучи, като музика!' },
      { type: 'plain',        text: 'Очаква те незабравимо приключение.' },
      { type: 'plain',        text: 'Донеси си усмивка, а магията е от нас.' },
      { type: 'inline',       parts: [
        { text: 'Очаквам те в ', font: fonts.reg },
        { text: 'Wonderland',    font: fonts.bold },
      ]},
    ];
  }

  /** ---------- Главно генериране ---------- */
  async function generatePdf(values) {
    await ensurePdfLibAndFontkit();
    const { PDFDocument, rgb } = window.PDFLib;

    const tplUrl = TEMPLATE_URLS[values.tpl] || TEMPLATE_URLS.v1;
    const [tplResp, regResp, boldResp] = await Promise.all([
      fetch(tplUrl), fetch(REGULAR_FONT_URL), fetch(BOLD_FONT_URL)
    ]);
    if (!tplResp.ok)  throw new Error('Missing template PDF');
    if (!regResp.ok)  throw new Error('Missing regular font');
    if (!boldResp.ok) throw new Error('Missing bold font');

    const [tplBytes, regBytes, boldBytes] = await Promise.all([
      tplResp.arrayBuffer(), regResp.arrayBuffer(), boldResp.arrayBuffer()
    ]);

    const pdfDoc = await PDFDocument.load(tplBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const regularFont = await pdfDoc.embedFont(regBytes,  { subset: true });
    const boldFont    = await pdfDoc.embedFont(boldBytes, { subset: true });

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    /** Геометрия/типография (център, лява граница, начало, ширина на блока, базов размер/водене) */
    const centerX   = width / 2;
    const leftX     = centerX - (width * 0.52) / 2;
    const startY    = height * 0.78;
    const maxWidth  = width * 0.52;
    const fontSize  = 24;
    const leading   = Math.round(fontSize * 1.18);

    const fonts = { reg: regularFont, bold: boldFont };
    const lines = buildLines(fonts, values);

    const isRabbit = values.tpl === 'v2';
    const align    = isRabbit ? 'left' : 'center';

    const visualLineCounterRef = { count: 0 };
    const getVisualOffset = (n) => (RABBIT_OFFSET_MODE === 'visual' && isRabbit)
      ? (OFFSETS_V2_VISUAL[n - 1] ?? 0) : 0;

    let contentLineIdx = 0;
    const getContentOffset = (idx) => (isRabbit && RABBIT_OFFSET_MODE === 'content')
      ? (OFFSETS_V2_CONTENT[idx - 1] ?? 0) : 0;

    let y = startY;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = (i === lines.length - 1);

      if (line.type === 'plain') {
        if (isRabbit && RABBIT_OFFSET_MODE === 'content') {
          const fixedOffset = getContentOffset(++contentLineIdx);
          y = drawPlain(page, line.text, y, {
            align, centerX, leftX, maxWidth, lineHeight: leading,
            font: regularFont, fontSize, color: undefined, opacity: 1,
            getVisualOffset, fixedOffset, visualLineCounterRef, debugFont: regularFont
          });
        } else {
          y = drawPlain(page, line.text, y, {
            align, centerX, leftX, maxWidth, lineHeight: leading,
            font: regularFont, fontSize, color: undefined, opacity: 1,
            getVisualOffset, fixedOffset: null, visualLineCounterRef, debugFont: regularFont
          });
        }

      } else if (line.type === 'single-line') {
        let off = 0, dbg = null;
        if (isRabbit && RABBIT_OFFSET_MODE === 'content') {
          off = getContentOffset(++contentLineIdx);
          dbg = ++visualLineCounterRef.count;
        } else {
          const idx = ++visualLineCounterRef.count;
          off = getVisualOffset(idx);
          dbg = idx;
        }
        drawSingleLine(page, line.text, y, {
          align, centerX, leftX, font: regularFont, fontSize, color: undefined, opacity: 1,
          offsetPx: off, debugIndex: dbg, debugFont: regularFont
        });
        y -= leading;

      } else if (line.type === 'inline') {
        let off = 0, idxForDebug;
        if (isRabbit && RABBIT_OFFSET_MODE === 'content') {
          off = getContentOffset(++contentLineIdx);
          idxForDebug = ++visualLineCounterRef.count;
        } else {
          idxForDebug = ++visualLineCounterRef.count;
          off = getVisualOffset(idxForDebug);
        }

        const useGold = isRabbit && isLastLine;
        const size = useGold ? V2_LASTLINE.size : fontSize;
        const color = useGold ? rgb(V2_LASTLINE.gold.r, V2_LASTLINE.gold.g, V2_LASTLINE.gold.b) : undefined;

        if (useGold) {
          const shadowOffset = V2_LASTLINE.shadow.offset;
          const shadowColor  = rgb(0, 0, 0);
          drawInline(page, line.parts, y - shadowOffset, {
            align,
            centerX: centerX + shadowOffset,
            leftX:  leftX + shadowOffset,
            fontSize: size,
            color: shadowColor,
            opacity: V2_LASTLINE.shadow.opacity,
            offsetPx: off,
            index: idxForDebug,
            debugFont: regularFont
          });
        }

        drawInline(page, line.parts, y, {
          align, centerX, leftX, fontSize: size, color, opacity: 1, offsetPx: off, index: idxForDebug, debugFont: regularFont
        });

        y -= Math.round(size * 1.18);

      } else if (line.type === 'inline-dynamic' && line.key === 'whenNameAge') {
        const t = fmtTime(values.time);

        if (!isRabbit) {
          const idxForDebug = ++visualLineCounterRef.count;
          const partsFull = [
            { text: 'Точно в ',    font: regularFont },
            { text: `${t} `,       font: boldFont },
            { text: `${values.name} `, font: boldFont },
            { text: 'ще навърши ', font: regularFont },
            { text: `${values.age}г.`, font: boldFont },
          ];
          drawInline(page, partsFull, y, {
            align, centerX, leftX, fontSize, color: undefined, opacity: 1, offsetPx: 0, index: idxForDebug, debugFont: regularFont
          });
          y -= Math.round(fontSize * 1.18);

        } else {
          // v2 на два реда
          let off1 = 0, idx1;
          if (RABBIT_OFFSET_MODE === 'content') { off1 = getContentOffset(++contentLineIdx); idx1 = ++visualLineCounterRef.count; }
          else                                   { idx1 = ++visualLineCounterRef.count;       off1 = getVisualOffset(idx1); }

          drawInline(page, [
            { text: 'Точно в ', font: regularFont },
            { text: `${t}`,     font: boldFont },
          ], y, {
            align, centerX, leftX, fontSize, color: undefined, opacity: 1, offsetPx: off1, index: idx1, debugFont: regularFont
          });
          y -= Math.round(fontSize * 1.18);

          let off2 = 0, idx2;
          if (RABBIT_OFFSET_MODE === 'content') { off2 = getContentOffset(++contentLineIdx); idx2 = ++visualLineCounterRef.count; }
          else                                   { idx2 = ++visualLineCounterRef.count;       off2 = getVisualOffset(idx2); }

          drawInline(page, [
            { text: `${values.name} `, font: boldFont },
            { text: 'ще навърши ',     font: regularFont },
            { text: `${values.age}г.`, font: boldFont },
          ], y, {
            align, centerX, leftX, fontSize, color: undefined, opacity: 1, offsetPx: off2, index: idx2, debugFont: regularFont
          });
          y -= Math.round(fontSize * 1.18);
        }
      }
    }

    /** Сваляне */
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safe = (values.name || 'рожденик').replace(/[^\p{L}\p{N}\-_]+/gu, '_');
    a.download = `Wonderland_Invite_${safe}_${values.age || ''}_${values.tpl || 'v1'}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /** ---------- Събиране на стойностите от формата ---------- */
  function collectValues() {
    const fd = new FormData(form);
    const name = (fd.get('from') || '').toString().trim(); // „От“ = име на рожденика
    let age = (fd.get('age') || '').toString().trim();
    if (age) {
      const n = parseInt(age, 10);
      age = Number.isFinite(n) && n > 0 ? String(n) : '';
    }
    return {
      name,
      age,
      date: (fd.get('date') || '').toString(),
      time: (fd.get('time') || '').toString(),
      tpl:  (fd.get('tpl')  || 'v1').toString(),
    };
  }

  /** ---------- Събития ---------- */
  btnDownload?.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    try {
      await generatePdf(collectValues());
    } catch (e) {
      console.error(e);
      alert('Проблем при генерирането. Провери темплейтите и шрифта Rosarium.ttf.');
    }
  });
})();
