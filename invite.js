// invite.js – покана "като на картинката" с bold върху час, име, възраст и "Wonderland".
// ТЕМПЛЕЙТ/ШРИФТОВЕ:
//   /assets/invite/invite.pdf
//   /assets/Rosarium.ttf  (използва се за regular и bold)

(() => {
  const form        = document.getElementById('inviteForm');
  const btnDownload = document.getElementById('inviteDownloadBtn');

  const TEMPLATE_URL     = '/assets/invite/invite.pdf';
  const REGULAR_FONT_URL = '/assets/Rosarium.ttf';
  const BOLD_FONT_URL    = '/assets/Rosarium.ttf'; // ако имаш Rosarium-Bold.ttf, посочи него тук

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

  // BG формат
  function fmtDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('bg-BG', { day: '2-digit', month: 'long', year: 'numeric' });
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

  // Помощни за рисуване с inline bold
  function lineWidth(parts, fontSize) {
    return parts.reduce((sum, p) => sum + p.font.widthOfTextAtSize(p.text, fontSize), 0);
  }
  function drawInlineCentered(page, parts, y, centerX, fontSize) {
    const total = lineWidth(parts, fontSize);
    let x = centerX - total / 2;
    for (const p of parts) {
      page.drawText(p.text, { x, y, size: fontSize, font: p.font });
      x += p.font.widthOfTextAtSize(p.text, fontSize);
    }
  }

  // Обикновени центрирани редове (без inline bold)
  function drawPlainCentered(page, text, y, centerX, maxWidth, lineHeight, font, size) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';

    for (const w of words) {
      const candidate = cur ? cur + ' ' + w : w;
      const wpx = font.widthOfTextAtSize(candidate, size);
      if (wpx <= maxWidth || !cur) cur = candidate;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);

    let yy = y;
    for (const ln of lines) {
      const wpx = font.widthOfTextAtSize(ln, size);
      const x = centerX - wpx / 2;
      page.drawText(ln, { x, y: yy, size, font });
      yy -= lineHeight;
    }
    return yy; // последна y позиция (за продължаване)
  }

  // Сглобяване на всички редове (вкл. bold редовете)
  function buildLines({ name, age }, fonts) {
    // Час/дата не са отделни редове в образеца освен в bold линията с името и възрастта
    // Часът ще бъде подаден отделно при рисуването на bold линията по-долу.
    return [
      { type: 'plain', text: 'Време е да се впуснем в' },
      { type: 'plain', text: 'чудна веселба' },

      // Bold редът (ще се попълни динамично в generatePdf, защото ползва и време)
      { type: 'inline-dynamic', key: 'whenNameAge' },

      { type: 'plain', text: 'Заедно ще отворим тайната' },
      { type: 'plain', text: 'врата място, където игрите оживяват,' },
      { type: 'plain', text: 'балоните шепнат желания, а смехът' },
      { type: 'plain', text: 'звучи, като музика!' },

      { type: 'plain', text: 'Очаква те незабравимо приключение.' },
      { type: 'plain', text: 'Донеси си усмивка, а магията е от нас.' },

      // Очаквам те в Wonderland
      { type: 'inline', parts: [
        { text: 'Очаквам те в ', font: fonts.reg },
        { text: 'Wonderland',    font: fonts.bold },
      ]},
    ];
  }

  async function generatePdf(values) {
    await ensurePdfLibAndFontkit();
    const { PDFDocument } = window.PDFLib;

    const [tplResp, regResp, boldResp] = await Promise.all([
      fetch(TEMPLATE_URL),
      fetch(REGULAR_FONT_URL),
      fetch(BOLD_FONT_URL)
    ]);
    if (!tplResp.ok)  throw new Error('Missing template PDF');
    if (!regResp.ok)  throw new Error('Missing regular font');
    if (!boldResp.ok) throw new Error('Missing bold font');

    const [tplBytes, regBytes, boldBytes] = await Promise.all([
      tplResp.arrayBuffer(),
      regResp.arrayBuffer(),
      boldResp.arrayBuffer()
    ]);

    const pdfDoc = await PDFDocument.load(tplBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const regularFont = await pdfDoc.embedFont(regBytes,  { subset: true });
    const boldFont    = await pdfDoc.embedFont(boldBytes, { subset: true });

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    // Размери: по-едър текст и по-събрани редове (както си ги настроил)
    const centerX   = width / 2;
    const startY    = height * 0.78;
    const maxWidth  = width * 0.52;
    const fontSize  = 24;
    const leading   = Math.round(fontSize * 1.18);

    const fonts = { reg: regularFont, bold: boldFont };
    const lines = buildLines(values, fonts);

    let y = startY;
    for (const line of lines) {
      if (line.type === 'plain') {
        y = drawPlainCentered(page, line.text, y, centerX, maxWidth, leading, regularFont, fontSize);
      } else if (line.type === 'inline') {
        drawInlineCentered(page, line.parts, y, centerX, fontSize);
        y -= leading;
      } else if (line.type === 'inline-dynamic' && line.key === 'whenNameAge') {
        // "Точно в 13:00 Деян ще навърши 8г."
        const t = fmtTime(values.time);
        const parts = [
          { text: 'Точно в ',   font: regularFont },
          { text: `${t} `,      font: boldFont },
          { text: `${values.name} `, font: boldFont },
          { text: 'ще навърши ', font: regularFont },
          { text: `${values.age}г.`, font: boldFont },
        ];
        drawInlineCentered(page, parts, y, centerX, fontSize);
        y -= leading;
      }
    }

    // НЯМА подпис/организатор долу — премахнато по изискване

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safe = (values.name || 'рожденик').replace(/[^\p{L}\p{N}\-_]+/gu, '_');
    a.download = `Wonderland_Invite_${safe}_${values.age || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function collectValues() {
    const fd = new FormData(form);
    // Използваме "От" като ИМЕ НА РОЖДЕНИКА
    let name = (fd.get('from') || '').toString().trim();

    let age = (fd.get('age') || '').toString().trim();
    if (age) {
      const n = parseInt(age, 10);
      age = Number.isFinite(n) && n > 0 ? String(n) : '';
    }
    return {
      name, // от "От"
      age,
      date: (fd.get('date') || '').toString(),
      time: (fd.get('time') || '').toString(),
    };
  }

  btnDownload?.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    try {
      await generatePdf(collectValues());
    } catch (e) {
      console.error(e);
      alert('Проблем при генерирането. Провери темплейта и шрифта Rosarium.ttf.');
    }
  });
})();
