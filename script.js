const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const body = document.body;
const root = document.documentElement;

/* ---------- 1. Preparar texto para aparecer palabra por palabra ---------- */
function mkWord(text, state) {
  const w = document.createElement("span");
  w.className = "w";
  w.setAttribute("aria-hidden", "true");
  const i = document.createElement("span");
  i.className = "wi";
  i.style.setProperty("--i", state.i++);
  i.textContent = text;
  w.appendChild(i);
  return w;
}

function splitNode(node, state, chars) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === 3) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(" "));
        if (chars) [...part].forEach((ch) => frag.appendChild(mkWord(ch, state)));
        else frag.appendChild(mkWord(part, state));
      });
      child.replaceWith(frag);
    } else if (child.nodeType === 1 && child.tagName !== "BR") {
      splitNode(child, state, chars);
    }
  });
}

document.querySelectorAll("h1, h2, .project h3, .pf-title").forEach((el) => {
  const chars = el.classList.contains("cta__title");
  el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  el.classList.remove("reveal");
  el.classList.add("split");
  if (chars) el.classList.add("split-chars");
  splitNode(el, { i: 0 }, chars);
});

/* ---------- 2. Variantes de aparición + escalonado ---------- */
document.querySelectorAll(".eyebrow, .tag, .lead, .project__body p, .tools").forEach((el) => el.classList.add("reveal"));
document.querySelectorAll(".about__photo, .timeline li").forEach((el) => el.classList.add("reveal", "reveal-left"));
document.querySelectorAll(".quote").forEach((el) => el.classList.add("reveal-pop"));
document.querySelectorAll(".project--rev .project__body").forEach((el) => el.classList.add("reveal-right"));

const stagger = (selector, step = 120, base = 0) =>
  document.querySelectorAll(selector).forEach((el, i) => (el.style.transitionDelay = `${base + i * step}ms`));

stagger(".cards .card", 140);
stagger(".timeline li", 130);
stagger(".hero__sub", 0, 700);
stagger(".hero__cta", 0, 900);
stagger(".hero__mascot", 0, 400);
stagger(".hero .eyebrow", 0, 100);
stagger(".project__body p", 120, 250);
stagger(".project__body .tools", 0, 700);

/* ---------- 3. Observador de scroll (se activa al terminar la carga) ---------- */
function startReveals() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => e.target.classList.toggle("is-in", e.isIntersecting));
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal, .split, .project").forEach((el) => io.observe(el));
}

/* ---------- 4. Pantalla de carga ---------- */
const loader = document.getElementById("loader");
const bar = document.getElementById("loaderBar");
const pct = document.getElementById("loaderPct");

function finishLoading() {
  loader.classList.add("is-done");
  body.classList.remove("is-loading");
  setTimeout(startReveals, 450); // el hero arranca mientras la cortina sube
  setTimeout(() => loader.classList.add("is-gone"), 1000);
}

if (reduce || !loader) {
  if (loader) loader.classList.add("is-gone");
  body.classList.remove("is-loading");
  if (reduce) document.querySelectorAll(".reveal, .split").forEach((el) => el.classList.add("is-in"));
  else startReveals();
} else {
  const DURATION = 1800;
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const tick = (now) => {
    const t = Math.min(1, (now - t0) / DURATION);
    const v = Math.round(ease(t) * 100);
    bar.style.width = v + "%";
    pct.textContent = String(v).padStart(3, "0") + "%";
    if (t < 1) requestAnimationFrame(tick);
    else {
      const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
      fonts.then(() => setTimeout(finishLoading, 150));
    }
  };
  requestAnimationFrame(tick);
}

/* ---------- 5. Scroll: barra de progreso + parallax ---------- */
const progress = document.getElementById("progress");
let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--sy", y);
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      ticking = false;
    });
  },
  { passive: true }
);

/* ---------- 6. Barras de skills ---------- */
const skills = document.querySelector(".skills");
if (skills) {
  new IntersectionObserver((entries) => {
    entries.forEach((e) => skills.classList.toggle("is-in", e.isIntersecting));
  }, { threshold: 0.4 }).observe(skills);
}

/* ---------- 7. La pupila de la mascota sigue el cursor ---------- */
const mascot = document.getElementById("mascot");
const pupil = document.getElementById("pupil");

if (mascot && pupil) {
  const baseX = 38, baseY = 46, max = 7;
  window.addEventListener("pointermove", (ev) => {
    const r = mascot.getBoundingClientRect();
    const dx = ev.clientX - (r.left + r.width / 2);
    const dy = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 300);
    pupil.setAttribute("x", baseX + (dx / d) * max * k);
    pupil.setAttribute("y", baseY + (dy / d) * max * k);
  });
}

/* ---------- 8. Extras interactivos ---------- */
// Tarjetas que se inclinan hacia el cursor
document.querySelectorAll(".card, .pf-card, .swatch").forEach((c) => {
  c.addEventListener("pointermove", (ev) => {
    const r = c.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5;
    const y = (ev.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
  });
  c.addEventListener("pointerleave", () => (c.style.transform = ""));
});
// La mascota salta al hacer clic
document.querySelectorAll(".mascot--xl, .hero__mascot svg").forEach((m) =>
  m.addEventListener("click", () => {
    m.classList.remove("jump"); void m.getBoundingClientRect(); m.classList.add("jump");
  })
);
// Contadores (portafolio)
document.querySelectorAll("[data-count]").forEach((el) => {
  new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const end = +el.dataset.count, t0 = performance.now();
    const step = (n) => { const t = Math.min(1, (n - t0) / 1200); el.textContent = Math.round(end * t); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 }).observe(el);
});
