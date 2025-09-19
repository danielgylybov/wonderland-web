async function loadPackagesFromSheetJSONP() {
  return new Promise((resolve, reject) => {
    const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzScFAQ04UcDPY45STz97unF7AxtvgHTtjaLlbY85LKaSVCSGH-CFm3zU2eHTyXLuuG/exec';
    const cb = 'sheetCb_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');

    window[cb] = (payload) => {
      try {
        // Дефолти + безопасен мердж на EUR конфиг
        const defaults = {
          title: 'Пакети',
          subtitle: '',
          currency: 'лв',
          pricePrefix: 'от',
          secondary: {
            enabled: false,
            rate: 1,    // множител от основната към вторичната
            label: ''   // напр. '€' или 'лв'
          },
          packages: []
        };

        window.PACKAGES = Object.assign({}, defaults, payload, {
          secondary: Object.assign({}, defaults.secondary, payload?.secondary)
        });
        resolve(window.PACKAGES);
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
    window.PACKAGES = {
      title:'Пакети', subtitle:'', currency:'лв', pricePrefix:'от',
      secondary:{ enabled:false, rate:1, label:'' },
      packages:[]
    };
  }
  if (typeof renderPackagesSection === 'function') renderPackagesSection();
});
