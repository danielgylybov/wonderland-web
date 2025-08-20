// ЛОГО: от Hero в Header при скрол
      document.addEventListener("DOMContentLoaded", function () {
        const header = document.getElementById("stickyHeader");

        // Търсим логото/елемента в hero по няколко възможни селектора,
        // а ако го няма – ползваме самата секция .hero.
        const target =
          document.querySelector(".hero-logo-text") ||          // старият H1
          document.querySelector(".hero .logo-svg") ||          // ако ползваш маска/див за SVG
          document.querySelector(".hero img, .hero svg") ||     // ако е <img> или inline <svg>
          document.querySelector(".hero");                      // fallback – цялата секция

        if (!header || !target) {
          // ако нещо липсва, просто показваме хедъра
          header?.classList.add("show-logo");
          return;
        }

        // По-устойчиво: IntersectionObserver вместо изчисления на пиксели
        const io = new IntersectionObserver(
          ([entry]) => {
            // показваме хедъра когато target излезе от екрана
            header.classList.toggle("show-logo", !entry.isIntersecting);
          },
          {
            threshold: 0,
            // ако хедърът е ~56px висок, това маха "премигването" на границата
            rootMargin: "-56px 0px 0px 0px"
          }
        );

        io.observe(target);
      });



document.addEventListener("DOMContentLoaded", () => {
  // показване на логото при скрол (ако още ползваш текста в hero)
  const header = document.getElementById("stickyHeader");
  const heroTarget =
    document.querySelector(".hero-logo-text") ||
    document.querySelector(".hero .logo-svg") ||
    document.querySelector(".hero img, .hero svg") ||
    document.querySelector(".hero");
  if (header && heroTarget) {
    const io = new IntersectionObserver(
      ([entry]) => header.classList.toggle("show-logo", !entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    io.observe(heroTarget);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const svg = document.getElementById('starfield');
  if (!svg) return;

  const variants = ['#star-shape', '#star-shape-rot', '#star-shape-slim'];
  const BASE_H = 100;             // фиксираме височина на viewBox
  const STAR_COUNT_BASE = 120;     // броят за aspect ratio ~1:1

  function clearStars() {
    // пазим <defs>, махаме останалото
    [...svg.querySelectorAll(':scope > g, :scope > use')].forEach(n => n.remove());
  }

  function buildStars() {
    clearStars();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const vbH = BASE_H;
    const vbW = BASE_H * (w / h);         // ширина на viewBox според екрана
    svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

    // по желание: скалирай броя спрямо площта, за да е с еднаква плътност
    const areaFactor = vbW * vbH / (100 * 100);
    const STAR_COUNT = Math.round(STAR_COUNT_BASE * areaFactor);

    for (let i = 0; i < STAR_COUNT; i++) {
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      const ref = variants[Math.floor(Math.random() * variants.length)];
      use.setAttribute('href', ref);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', ref);
      use.setAttribute('class', 'star');

      // позиция в новия viewBox
      const x = Math.random() * vbW;
      const y = Math.random() * vbH;

      // размер – 0.8–2.2 единици от viewBox (не се влияе от aspect ratio)
      const size = (Math.random() * 1.4 + 0.8).toFixed(2);
      use.setAttribute('x', x.toFixed(2));
      use.setAttribute('y', y.toFixed(2));
      use.setAttribute('width', size);
      use.setAttribute('height', size);

      // леко пулсиране и дрейф
      use.style.setProperty('--pulse', (0.95 + Math.random()*0.1).toFixed(2));
      use.style.setProperty('--twinkle', (4 + Math.random()*4).toFixed(1) + 's');
      use.style.setProperty('--drift', (90 + Math.random()*60).toFixed(0) + 's');
      use.style.animationDelay = (Math.random()*6).toFixed(2) + 's';

      // опционално: ротация около собствената позиция
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `rotate(${Math.floor(Math.random()*360)} ${x} ${y})`);
      g.appendChild(use);
      svg.appendChild(g);
    }
  }

  // първоначално
  buildStars();

  // прегенерираме при resize / ориентация (с debounce)
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(buildStars, 150);
  });
});
