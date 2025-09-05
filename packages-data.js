/* packages-data.js
 * Източник на данни за пакетите.
 * Днес: локален обект. Утре: лесно може да се смени с fetch() от Google Sheets JSON/CSV.
 */

window.PACKAGES_COPY = {
  title: "Пакети",
  subtitle: "Избери ниво според мечтата и мащаба. Винаги може да персонализираме.",
  pricePrefix: "от",
  viewMore: "Виж още",

  // Конфиг на картите (HTML класове/текстове)
  card: {
    titleTag: "h3",
    titleClass: "mb-2",
    descClass: "opacity-75 mb-3",
    priceClass: "price mb-3",
    featuresClass: "mb-4 opacity-90",
    buttonClass: "btn btn-primary w-100 view-more",
    buttonText: "Детайли" // ако искаш да е различно от global viewMore
  }
};

window.PACKAGES_DATA = {
  currency: "лв",
  /* дефиниция на пакетите */
  packages: [
    {
      id: "basic",
      name: "Basic",
      desc: "Елегантен старт за малки празници.",
      basePrice: 390,
      tiers: [
        { label: "до 10 гости",  multiplier: 1.00 },
        { label: "до 20 гости",  multiplier: 1.25 },
        { label: "до 30 гости",  multiplier: 1.45 },
      ],
      features: [
        "Базов декор и цветове",
        "До 2 тематични акцента",
        "Подредба на място"
      ],
      galleryIds: [] // Drive id-та (по желание) за мини-галерия в оувърлея
    },
    {
      id: "signature",
      name: "Signature",
      desc: "Най-популярният ни баланс цена/уоу.",
      basePrice: 790,
      tiers: [
        { label: "до 20 гости", multiplier: 1.00 },
        { label: "до 40 гости", multiplier: 1.30 },
        { label: "до 60 гости", multiplier: 1.55 },
      ],
      features: [
        "Разширен декор и арки",
        "Персонализирани табели",
        "Координация на доставчици"
      ],
      galleryIds: [],
      featured: true // по желание: визуален акцент
    },
    {
      id: "wonder",
      name: "Wonder",
      desc: "Компактен празничен сет с украса, анимация и базов кетъринг за деца.",
      basePrice: 590, // сложи реална базова цена
      tiers: [
        { label: "до 10 деца", multiplier: 1.00 },
        { label: "до 15 деца", multiplier: 1.20 },
        { label: "до 20 деца", multiplier: 1.40 }
      ],
      features: [
        "2 ч. 30 мин. наем + 30 мин. подготовка/посрещане",
        "Посуда, чинийки за торта, салфетки и свещичка",
        "Поздравителна дъска и балони",
        "Анимация 90 мин. (2 аниматори, озвучаване, торта, парти тату) – 10% отстъпка",
        "Кетъринг за до 15 деца: лимонада 2 вкуса (3 л/вкус), вода 330 мл/дете, пръчици морков/краставица, сезонни плодове, плато микс 1 кг (пилешки хапки, топени сирена, кашкавалчета, кюфтенца), голяма пица (маргарита или с колбас), пуканки"
      ],
      addOns: [
        "Кетъринг за 15 възрастни: плато микс 1 кг, брускети (сьомга/авокадо), клин/пататник, боровинково сладко, чеснов сос – 180 лв",
        "Топли/студени напитки за възрастни – 50 лв",
        "Безалкохолни за възрастни – по договаряне",
        "Анимационни парти добавки – изпращаме файл",
        "Допълнителен престой: 30 мин – 50 лв, 60 мин – 100 лв"
      ],
      galleryIds: []
    }
  ]
};

/* --- Шаблон за бъдещ Google Sheets източник ---
   Примерно, ще държиш таблица с колони:
   id | name | desc | basePrice | tier1Label | tier1X | tier2Label | tier2X | ... | features | galleryIds
   После тук просто ще направиш:

async function loadPackagesFromSheets() {
  const SHEETS_JSON_URL = "https://.../yourSheetsEndpoint"; // публикуван Sheet → JSON
  const res = await fetch(SHEETS_JSON_URL);
  const rows = await res.json();
  // map-ваш rows → в горния формат (id, name, desc, basePrice, tiers[], features[], galleryIds[])
  return mapped;
}

И в packages.js вместо window.PACKAGES_DATA ще await-неш loadPackagesFromSheets().
*/
