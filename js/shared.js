export let revealObserver;
export function revealElement(element, index = 0) {
  element.classList.add("reveal");
  element.style.setProperty("--reveal-delay", `${Math.min(index * 70, 420)}ms`);
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  ) {
    element.classList.add("is-visible");
    return;
  }
  revealObserver?.observe(element);
}
export function initAnimations() {
  if (!("IntersectionObserver" in window)) {
    document
      .querySelectorAll(".reveal")
      .forEach((element) => element.classList.add("is-visible"));
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -35px" },
  );
  document
    .querySelectorAll(".reveal")
    .forEach((element, index) => revealElement(element, index));
}
export function initHeroDecor() {
  const hero = document.querySelector(".hero-home");
  if (!hero || hero.querySelector(".hero-decor")) return;
  const HERO_DECOR_ITEMS = [
    { asset: "aries", className: "decor-aries" },
    { asset: "taurus", className: "decor-taurus" },
    { asset: "element1", className: "decor-e1" },
    { asset: "element2", className: "decor-e2" },
    { asset: "element4", className: "decor-e4" },
    { asset: "element7", className: "decor-e7" },
    { asset: "element9", className: "decor-e9" },
  ];
  const layoutNumber = Math.floor(Math.random() * 3) + 1;
  const layer = document.createElement("div");
  layer.className = `hero-decor decor-layout-${layoutNumber}`;
  layer.setAttribute("aria-hidden", "true");
  HERO_DECOR_ITEMS.forEach(({ asset, className }, index) => {
    const ornament = document.createElement("img");
    ornament.className = `hero-ornament ${className}`;
    ornament.src = `./image/decor/${asset}.svg`;
    ornament.alt = "";
    ornament.loading = "eager";
    ornament.decoding = "async";
    ornament.style.animationDelay = `${index * -0.55}s`;
    layer.append(ornament);
  });
  hero.prepend(layer);
}
export let activeModal = null;
export let modalOpener = null;
export function openModal(modal, opener) {
  if (!modal) return;
  modalOpener = opener || document.activeElement;
  activeModal = modal;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal
    .querySelector("[data-modal-close], button, a[href], input, select")
    ?.focus();
}
export function closeModal(modal = activeModal) {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  activeModal = null;
  const frame = modal.querySelector("iframe");
  if (frame) frame.removeAttribute("src");
  modalOpener?.focus();
  modalOpener = null;
}
export function initModals() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal
      .querySelectorAll("[data-modal-close]")
      .forEach((button) =>
        button.addEventListener("click", () => closeModal(modal)),
      );
    modal.addEventListener("mousedown", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (!activeModal) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...activeModal.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
const SHARED_PARTIALS = {
  header: `<header class="site-header"><nav class="container navbar" aria-label="Navigasi utama"><a class="brand" href="./index.html" aria-label="BEM PKN STAN Pendidikan Keilmuan"><span class="brand-logo-shell"><img class="brand-logo" src="./image/PK.webp" alt="BEM PKN STAN Pendidikan Keilmuan"></span></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-menu" aria-label="Buka menu navigasi"><span></span></button><ul class="nav-list" id="main-menu"><li><a class="nav-link" data-page="services" href="./layanan.html">Layanan Akademik</a></li><li><a class="nav-link" data-page="regulations" href="./peraturan.html">Peraturan</a></li><li><a class="nav-link" data-page="competitions" href="./info-lomba.html">Info Lomba</a></li><li><a class="nav-link" data-page="kti" href="./kti.html">Karya Tulis Ilmiah</a></li><li><a class="nav-link" data-page="pusat-studi" href="./pusat-studi.html">Pusat Studi</a></li></ul></nav></header>`,
  footer: `<footer class="footer"><div class="container footer-container"><section><div class="footer-brand"><img src="./image/PK.webp" alt="" loading="lazy" decoding="async"><h2>BEM PKN STAN</h2></div><p>Kementerian Pendidikan dan Keilmuan</p></section><nav aria-label="Navigasi footer"><h3>Tautan Cepat</h3><ul><li><a href="./index.html">Beranda</a></li><li><a href="https://lms.pknstan.ac.id" target="_blank" rel="noopener noreferrer">Bahan Ajar</a></li><li><a href="./layanan.html">Layanan Akademik</a></li><li><a href="./peraturan.html">Peraturan</a></li><li><a href="./info-lomba.html">Info Lomba</a></li><li><a href="./kti.html">Karya Tulis Ilmiah</a></li><li><a href="./pusat-studi.html">Pusat Studi</a></li></ul></nav><section><h3>Hubungi Kami</h3><ul><li><a href="https://www.instagram.com/pk.bempknstan" target="_blank" rel="noopener noreferrer">@pk.bempknstan</a></li><li><a href="mailto:pk.bem@pknstan.ac.id">pk.bem@pknstan.ac.id</a></li><li><a href="https://maps.google.com/?q=PKN+STAN" target="_blank" rel="noopener noreferrer">Jl. Bintaro Utama 5 Sektor V, Tangerang Selatan</a></li></ul></section></div><div class="container footer-bottom">© 2026 Kementerian Pendidikan dan Keilmuan BEM PKN STAN. All rights reserved.</div></footer>`,
};
export function loadPartials() {
  document.querySelectorAll("[data-include]").forEach((target) => {
    const html = SHARED_PARTIALS[target.dataset.include];
    if (!html) return;
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    target.replaceWith(template.content.cloneNode(true));
  });
}
export function markActiveNavigation() {
  const page = document.body.dataset.page;
  document
    .querySelectorAll(".nav-link[aria-current]")
    .forEach((link) => link.removeAttribute("aria-current"));
  if (!page) return;
  document
    .querySelector(`.nav-link[data-page="${page}"]`)
    ?.setAttribute("aria-current", "page");
}
