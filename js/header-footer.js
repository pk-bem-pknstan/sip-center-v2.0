import { createIcon } from "./utils.js";

export function initNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-list");
  if (!toggle || !menu) return;
  const close = () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    menu.classList.toggle("open", opening);
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) menu.querySelector("a")?.focus();
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      toggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".navbar")) close();
  });
}
export function initSharedIcons() {
  const iconForHref = (href) => {
    if (href.includes("instagram.com")) return "fa-brands fa-instagram";
    if (href.startsWith("mailto:")) return "fa-solid fa-envelope";
    if (href.includes("maps.google.com")) return "fa-solid fa-location-dot";
    if (href.includes("lms.pknstan.ac.id")) return "fa-solid fa-folder-open";
    if (href.endsWith("layanan.html")) return "fa-solid fa-graduation-cap";
    if (href.endsWith("peraturan.html")) return "fa-solid fa-scale-balanced";
    if (href.endsWith("info-lomba.html")) return "fa-solid fa-trophy";
    if (href.endsWith("kti.html")) return "fa-solid fa-book-open";
    if (href.endsWith("index.html")) return "fa-solid fa-house";
    if (href.endsWith("pusat-studi.html")) return "fa-solid fa-lightbulb";
    return "";
  };
  document.querySelectorAll(".nav-link, .footer a").forEach((link) => {
    if (link.querySelector("i")) return;
    const iconName = iconForHref(link.getAttribute("href") || "");
    if (iconName) link.prepend(createIcon(iconName));
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.querySelector(".nav-text")) return;
    const textNodes = [...link.childNodes].filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
    );
    if (!textNodes.length) return;
    const text = textNodes.map((node) => node.textContent.trim()).join(" ");
    textNodes.forEach((node) => node.remove());
    const label = document.createElement("span");
    label.className = "nav-text";
    label.textContent = text;
    link.append(label);
  });
}
