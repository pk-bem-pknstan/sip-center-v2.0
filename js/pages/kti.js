import {
  CONFIG,
  parseCSV,
  fetchWithTimeout,
  getSafeUrl,
  createIcon,
  createState,
  describeError,
} from "../utils.js";
import { revealElement } from "../shared.js";

export function initKTI() {
  const grid = document.querySelector("#kti-grid");
  if (!grid) return;
  const search = document.querySelector("#kti-search");
  const count = document.querySelector("#kti-count");
  let works = [];
  function render(items) {
    grid.replaceChildren();
    count.textContent = `${items.length} karya`;
    if (!items.length) {
      grid.append(
        createState("empty", "Coba gunakan judul atau nama penulis lain."),
      );
      return;
    }
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card kti-card";
      const icon = document.createElement("div");
      icon.className = "kti-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.append(createIcon("fa-solid fa-book-open"));
      const title = document.createElement("h3");
      title.textContent = item.title;
      const meta = document.createElement("div");
      meta.className = "card-meta";
      meta.textContent = `${item.author} | ${item.date}`;
      const description = document.createElement("p");
      description.textContent = item.description || "Tidak ada deskripsi.";
      card.append(icon, title, meta, description);
      const safeLink = getSafeUrl(item.link);
      if (safeLink) {
        const link = document.createElement("a");
        link.href = safeLink;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "btn card-action";
        link.append(
          document.createTextNode("Baca Karya"),
          createIcon("fa-solid fa-arrow-right icon-after"),
        );
        card.append(link);
      } else {
        const warning = document.createElement("span");
        warning.className = "card-meta";
        warning.textContent = "Tautan karya tidak tersedia atau tidak aman.";
        card.append(warning);
      }
      grid.append(card);
      revealElement(card, grid.children.length - 1);
    });
  }
  async function load() {
    grid.replaceChildren(
      createState("loading", "Mengambil karya tulis dari sistem."),
    );
    try {
      const rows = parseCSV(await fetchWithTimeout(CONFIG.ktiUrl, "text"));
      works = rows
        .slice(1)
        .filter((row) => row[0] || row[1])
        .map((row) => ({
          title: row[0] || "Tanpa Judul",
          author: row[1] || "Anonim",
          date: row[2] || "-",
          description: row[3] || "",
          theme: row[4] || "-",
          link: row[5] || "",
        }));
      render(works);
    } catch (error) {
      grid.replaceChildren(createState("error", describeError(error), load));
      count.textContent = "0 karya";
    }
  }
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    render(
      works.filter((item) =>
        `${item.title} ${item.author} ${item.theme}`
          .toLowerCase()
          .includes(query),
      ),
    );
  });
  load();
}
