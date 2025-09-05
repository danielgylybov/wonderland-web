/* ========= Google Drive Gallery (thumbnail-only) ========= */
const DRIVE_API_KEY   = "AIzaSyC00jviMaVBd4iQT7TOEhLRll4UaFvpp3Y";
const DRIVE_FOLDER_ID = "1LFxFtxN33LmA17VSl5gSMVwkZQ_yY_6L";

const PAGE_SIZE   = 200;
const FILE_FIELDS = "files(id,name,mimeType),nextPageToken";

function thumbWidth() {
  const vw  = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const target = Math.ceil(vw * dpr);
  return Math.min(2000, Math.max(400, Math.round(target / 200) * 200));
}

function numericNameCompare(a, b) {
  const an = parseInt((a.name || "").match(/\d+/)?.[0] || "0", 10);
  const bn = parseInt((b.name || "").match(/\d+/)?.[0] || "0", 10);
  return an - bn || a.name.localeCompare(b.name);
}

function thumbUrl(id, w) {
  // само thumbnail endpoint
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
}

async function fetchDrivePage(pageToken = "") {
  const base = "https://www.googleapis.com/drive/v3/files";
  const q = encodeURIComponent(
    `'${DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`
  );
  const params = [
    `q=${q}`,
    `orderBy=name`,
    `fields=${encodeURIComponent(FILE_FIELDS)}`,
    `pageSize=${PAGE_SIZE}`,
    pageToken ? `pageToken=${pageToken}` : "",
    `key=${DRIVE_API_KEY}`,
    `spaces=drive`,
  ].filter(Boolean).join("&");

  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  return res.json();
}

async function getAllImages() {
  const all = [];
  let token = "";
  do {
    const data = await fetchDrivePage(token);
    all.push(...(data.files || []));
    token = data.nextPageToken || "";
  } while (token);
  return all.sort(numericNameCompare);
}

function buildCarousel(files) {
  const carousel   = document.getElementById("galleryCarousel");
  const inner      = carousel?.querySelector(".carousel-inner");
  const indicators = carousel?.querySelector(".carousel-indicators");
  if (!carousel || !inner || !indicators) return;

  inner.innerHTML = "";
  indicators.innerHTML = "";

  const w = thumbWidth();

  files.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "carousel-item" + (i === 0 ? " active" : "");

    const img = document.createElement("img");
    img.src = thumbUrl(f.id, w);
    img.setAttribute("data-id", f.id);
    img.alt = f.name || `Снимка ${i + 1}`;
    img.className = "d-block w-100";
    img.loading = i > 1 ? "lazy" : "eager";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer"; // по-„чисти“ заявки
    // ако даден размер е блокиран → опитай по-малък thumbnail (пак thumbnail endpoint)
    img.onerror = () => {
      const sizes = [1600, 1200, 800, 600, 500, 400];
      const curr  = parseInt((img.src.match(/sz=w(\d+)/)||[])[1] || w, 10);
      const next  = sizes.find(s => s < curr);
      if (next) img.src = thumbUrl(f.id, next);
    };

    item.appendChild(img);
    inner.appendChild(item);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("data-bs-target", "#galleryCarousel");
    dot.setAttribute("data-bs-slide-to", String(i));
    dot.setAttribute("aria-label", `Слайд ${i + 1}`);
    if (i === 0) dot.classList.add("active");
    indicators.appendChild(dot);
  });
}

(async function initDriveGallery(){
  try {
    if (!DRIVE_API_KEY) {
      console.warn("[DriveGallery] Липсва DRIVE_API_KEY.");
      return;
    }
    const files = await getAllImages();
    if (!files.length) return;
    buildCarousel(files);

    // при resize → обнови само thumbnail размера (оставаш на thumbnail endpoint)
    window.addEventListener("resize", debounce(() => {
      const w = thumbWidth();
      document.querySelectorAll("#galleryCarousel img").forEach(img => {
        const id = img.getAttribute("data-id");
        if (id) img.src = thumbUrl(id, w);
      });
    }, 200));
  } catch (err) {
    console.error("[DriveGallery] неуспешно зареждане:", err);
  }
})();

function debounce(fn, t){ let h; return (...a)=>{ clearTimeout(h); h=setTimeout(()=>fn(...a), t); }; }
