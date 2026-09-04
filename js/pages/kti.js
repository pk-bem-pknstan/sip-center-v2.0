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

const PAGE_SIZE = 12;

export function initKTI() {
  const grid = document.querySelector("#kti-grid");
  if (!grid) return;

  const search = document.querySelector("#kti-search");
  const themeFilter = document.querySelector("#kti-theme-filter");
  const count = document.querySelector("#kti-count");
  const pagination = document.querySelector("#kti-pagination");
  const prevButton = document.querySelector("#kti-prev-page");
  const nextButton = document.querySelector("#kti-next-page");
  const pageInfo = document.querySelector("#kti-page-info");

  if (
    !search ||
    !themeFilter ||
    !count ||
    !pagination ||
    !prevButton ||
    !nextButton ||
    !pageInfo
  ) {
    return;
  }

  const state = {
    all: [],
    filtered: [],
    page: 1,
    query: "",
    theme: "",
  };

  function createCard(item, index) {
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

    revealElement(card, index);
    return card;
  }

  function render({ restoreFocus = false, focusTarget = "grid" } = {}) {
    grid.replaceChildren();
    count.textContent = `${state.filtered.length} karya`;

    if (!state.filtered.length) {
      grid.append(
        createState("empty", "Coba gunakan kata kunci atau filter tema lain."),
      );
      pagination.hidden = true;
      return;
    }

    const totalPages = Math.ceil(state.filtered.length / PAGE_SIZE);
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

    pageItems.forEach((item, index) => {
      grid.append(createCard(item, index));
    });

    pagination.hidden = totalPages <= 1;
    pageInfo.textContent = `Halaman ${state.page} dari ${totalPages}`;
    prevButton.disabled = state.page === 1;
    nextButton.disabled = state.page === totalPages;

    if (restoreFocus) {
      document.querySelector("#kti-heading")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.requestAnimationFrame(() => {
        grid.setAttribute("tabindex", "-1");
        const target =
          focusTarget === "next" && !nextButton.disabled
            ? nextButton
            : focusTarget === "prev" && !prevButton.disabled
              ? prevButton
              : grid;
        target.focus({ preventScroll: true });
      });
    }
  }

  function applyFilters() {
    const query = state.query.trim().toLowerCase();
    state.filtered = state.all.filter((item) => {
      const matchesQuery =
        !query ||
        `${item.title} ${item.author} ${item.theme} ${item.description}`
          .toLowerCase()
          .includes(query);
      const matchesTheme = !state.theme || item.theme === state.theme;
      return matchesQuery && matchesTheme;
    });
    state.page = 1;
    render();
  }

  function populateThemeFilter() {
    themeFilter.querySelectorAll("option:not(:first-child)").forEach((option) => {
      option.remove();
    });

    const themes = [
      ...new Set(
        state.all
          .map((item) => item.theme.trim())
          .filter((theme) => theme && theme !== "-"),
      ),
    ].sort((a, b) => a.localeCompare(b, "id"));

    const fragment = document.createDocumentFragment();
    themes.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme;
      option.textContent = theme;
      fragment.append(option);
    });
    themeFilter.append(fragment);
  }

  async function load() {
    grid.replaceChildren(
      createState("loading", "Mengambil karya tulis dari sistem."),
    );
    pagination.hidden = true;

    try {
      const rows = parseCSV(await fetchWithTimeout(CONFIG.ktiUrl, "text"));
      state.all = rows
        .slice(1)
        .filter((row) => row[0] || row[1])
        .map((row) => ({
          title: row[0] || "Tanpa Judul",
          author: row[1] || "Anonim",
          date: row[2] || "-",
          description: row[3] || "",
          theme: String(row[4] || "-").trim() || "-",
          link: row[5] || "",
        }));

      populateThemeFilter();
      state.filtered = [...state.all];
      render();
    } catch (error) {
      grid.replaceChildren(createState("error", describeError(error), load));
      count.textContent = "0 karya";
      pagination.hidden = true;
    }
  }

  search.addEventListener("input", () => {
    state.query = search.value;
    applyFilters();
  });

  themeFilter.addEventListener("change", () => {
    state.theme = themeFilter.value;
    applyFilters();
  });

  prevButton.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    render({ restoreFocus: true, focusTarget: "prev" });
  });

  nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(state.filtered.length / PAGE_SIZE);
    if (state.page >= totalPages) return;
    state.page += 1;
    render({ restoreFocus: true, focusTarget: "next" });
  });

  load();
}
