  async function loadPackagesFromSheetJSONP() {
    return new Promise((resolve, reject) => {
      const SHEET_URL = 'https://script.google.com/macros/s/AKfycbz1xh4WrcfUNbdvNaRFrMfD9D3iyfiuDeDmtKzwrve0PbYp36F0ogCmDI19hlGml7s/exec';
      const cb = 'sheetCb_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');

      window[cb] = (payload) => {
        try {
          window.PACKAGES = payload;
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

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadPackagesFromSheetJSONP();
    } catch (e) {
      console.error(e);
      window.PACKAGES = { title:'Пакети', subtitle:'', currency:'лв', pricePrefix:'от', packages: [] };
    }
    if (typeof renderPackagesSection === 'function') renderPackagesSection();
  });
