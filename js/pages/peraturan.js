import {
  CONFIG,
  parseCSV,
  fetchWithTimeout,
  getSafeUrl,
  createIcon,
  createState,
  describeError,
} from "../utils.js";
import { openModal, revealElement } from "../shared.js";

export function initRegulations() {
  const grid = document.querySelector("#regulation-grid");
  if (!grid) return;
  const search = document.querySelector("#regulation-search");
  const count = document.querySelector("#regulation-count");
  const modal = document.querySelector("#pdf-modal");
  const frame = document.querySelector("#pdf-frame");
  let regulations = [];
  function normalizePdfUrls(rawLink) {
    const safeLink = getSafeUrl(rawLink);
    const safeFrame = getSafeUrl(rawLink, { purpose: "iframe" });
    if (!safeLink || !safeFrame) return { safeLink: "", safeFrame: "" };
    try {
      const url = new URL(safeFrame);
      if (url.hostname === "drive.google.com") {
        const match =
          url.pathname.match(/\/file\/d\/([^/]+)/) ||
          url.search.match(/[?&]id=([^&]+)/);
        if (match) {
          return {
            safeLink,
            safeFrame: `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview`,
          };
        }
      }
      return { safeLink, safeFrame };
    } catch {
      return { safeLink, safeFrame };
    }
  }
  function openPdf(item, opener) {
    const { safeLink, safeFrame } = normalizePdfUrls(item.link);
    document.querySelector("#pdf-title").textContent = item.title;
    document.querySelector("#pdf-description").textContent = item.description;
    const download = document.querySelector("#pdf-download");
    if (!safeLink || !safeFrame) {
      frame.hidden = true;
      frame.removeAttribute("src");
      download.hidden = true;
      document.querySelector("#pdf-error").hidden = false;
    } else {
      document.querySelector("#pdf-error").hidden = true;
      frame.hidden = false;
      frame.src = safeFrame;
      frame.title = `Pratinjau ${item.title}`;
      download.hidden = false;
      download.href = safeLink;
    }
    openModal(modal, opener);
  }
  function render(items) {
    grid.replaceChildren();
    count.textContent = `${items.length} dokumen`;
    if (!items.length) {
      grid.append(
        createState("empty", "Coba gunakan kata kunci yang lebih spesifik."),
      );
      return;
    }
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card reg-card";
      const icon = document.createElement("div");
      icon.className = "reg-icon";
      icon.setAttribute("aria-hidden", "true");
      const safeIcon = /^[a-z0-9-]+$/i.test(item.icon || "")
        ? item.icon
        : "file-pdf";
      icon.append(createIcon(`fa-solid fa-${safeIcon}`));
      const title = document.createElement("h3");
      title.textContent = item.title;
      const description = document.createElement("p");
      description.textContent = item.description;
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const view = document.createElement("button");
      view.type = "button";
      view.className = "btn card-action";
      view.append(
        createIcon("fa-solid fa-eye"),
        document.createTextNode("Lihat"),
      );
      view.addEventListener("click", () => openPdf(item, view));
      actions.append(view);
      const safeLink = getSafeUrl(item.link);
      if (safeLink) {
        const download = document.createElement("a");
        download.className = "btn btn-secondary card-action";
        download.href = safeLink;
        download.target = "_blank";
        download.rel = "noopener noreferrer";
        download.append(
          createIcon("fa-solid fa-cloud-arrow-down"),
          document.createTextNode("Unduh"),
        );
        actions.append(download);
      }
      card.append(icon, title, description, actions);
      grid.append(card);
      revealElement(card, grid.children.length - 1);
    });
  }
  async function load() {
    grid.replaceChildren(
      createState("loading", "Menyelaraskan basis data peraturan."),
    );
    try {
      const rows = parseCSV(
        await fetchWithTimeout(CONFIG.regulationUrl, "text"),
      );
      regulations = rows
        .slice(1)
        .filter((row) => row[1])
        .map((row) => ({
          title: row[1] || "Tanpa judul",
          description: row[2] || "Dokumen resmi peraturan kampus.",
          icon: row[3] || "file-pdf",
          link: row[4] || "",
        }));
      render(regulations);
    } catch (error) {
      grid.replaceChildren(createState("error", describeError(error), load));
      count.textContent = "0 dokumen";
    }
  }
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    render(
      regulations.filter((item) =>
        `${item.title} ${item.description}`.toLowerCase().includes(query),
      ),
    );
  });
  load();
}
