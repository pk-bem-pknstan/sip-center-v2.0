import {
  CONFIG,
  FetchError,
  getSafeUrl,
  safeDate,
  createIcon,
  createState,
  fetchWithTimeout,
  describeError,
} from "../utils.js";
import { openModal, revealElement } from "../shared.js";

const ALL_VALUE = "__all__";

function competitionStatus(value) {
  const deadline = safeDate(value);
  if (!deadline)
    return { label: "Buka", expired: false, className: "open" };
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline - today) / 86400000);
  if (days < 0)
    return { label: "Sudah Lewat", expired: true, className: "expired" };
  if (days <= 7)
    return {
      label: "Segera Berakhir",
      expired: false,
      className: "ending",
    };
  return { label: "Buka", expired: false, className: "open" };
}

function formatDate(value, options = {}) {
  const date = safeDate(value);
  if (!date) return value || "-";
  return date.toLocaleDateString("id-ID", options);
}

function dateTime(value) {
  return safeDate(value)?.getTime() ?? null;
}

function appendLinkified(container, value) {
  const text = String(value || "").trim();
  if (!text || text === "undefined") {
    container.textContent = "-";
    return;
  }
  const urlRegex =
    /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
  let cursor = 0;
  let hasLink = false;
  text.replace(urlRegex, (match, offset) => {
    if (offset > cursor) container.append(document.createTextNode(text.slice(cursor, offset)));
    const href = match.match(/^https?:\/\//i) ? match : `https://${match}`;
    const safeHref = getSafeUrl(href);
    if (safeHref) {
      const link = document.createElement("a");
      link.href = safeHref;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = match;
      container.append(link);
      hasLink = true;
    } else {
      container.append(document.createTextNode(match));
    }
    cursor = offset + match.length;
    return match;
  });
  if (cursor < text.length) container.append(document.createTextNode(text.slice(cursor)));
  if (!container.childNodes.length || !hasLink) container.textContent = text;
}

function createFilterOption(value, groupName, labelText, onChange, isAll = false) {
  const label = document.createElement("label");
  label.className = "check-option";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = value;
  input.name = groupName;
  input.className = `${groupName}-check`;
  if (isAll) {
    input.checked = true;
    input.dataset.allFilter = "true";
  }
  input.addEventListener("change", onChange);
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(input, text);
  return label;
}

function buildCheckOptions(panel, values, groupName, allLabel, onChange) {
  panel.replaceChildren(
    createFilterOption(ALL_VALUE, groupName, allLabel, onChange, true),
  );
  values.forEach((value) => {
    panel.append(createFilterOption(value, groupName, value, onChange));
  });
}

function initFilterDropdowns() {
  const groups = [...document.querySelectorAll(".filter-group")];
  let scrollTimer = null;
  const closeAll = (except) =>
    groups.forEach((group) => {
      if (group === except) return;
      const panel = group.querySelector(".filter-panel");
      const button = group.querySelector(".filter-toggle");
      if (!panel || !button) return;
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });
  groups.forEach((group) => {
    const button = group.querySelector(".filter-toggle");
    const panel = group.querySelector(".filter-panel");
    panel.addEventListener("click", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = panel.hidden;
      closeAll(group);
      panel.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
      if (opening) panel.querySelector("input")?.focus();
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
        button.focus();
      }
    });
  });
  document.addEventListener("click", () => closeAll());
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer) return;
      scrollTimer = window.setTimeout(() => {
        closeAll();
        scrollTimer = null;
      }, 100);
    },
    { passive: true },
  );
}

export function initCompetitions() {
  const grid = document.querySelector("#competitions-grid");
  if (!grid) return;
  const count = document.querySelector("#competition-count");
  const search = document.querySelector("#competition-search");
  const sort = document.querySelector("#competition-sort");
  const pagination = document.querySelector("#competition-pagination");
  const detailModal = document.querySelector("#competition-modal");
  const modalBody = document.querySelector("#competition-modal-body");
  const state = {
    all: [],
    filtered: [],
    page: 1,
    categories: new Set(),
    statuses: new Set(),
    months: new Set(),
    query: "",
    sort: "desc",
  };
  const pageSize = 9;

  function selected(selector) {
    return new Set(
      [...document.querySelectorAll(`${selector}:checked`)]
        .map((input) => input.value)
        .filter((value) => value !== ALL_VALUE),
    );
  }

  function syncAllCheckbox(selector) {
    const inputs = [...document.querySelectorAll(selector)];
    const allInput = inputs.find((input) => input.value === ALL_VALUE);
    const valueInputs = inputs.filter((input) => input.value !== ALL_VALUE);
    if (!allInput) return;
    allInput.checked = !valueInputs.some((input) => input.checked);
  }

  function handleFilterChange(selector, applyHandler) {
    return (event) => {
      const inputs = [...document.querySelectorAll(selector)];
      const allInput = inputs.find((input) => input.value === ALL_VALUE);
      const valueInputs = inputs.filter((input) => input.value !== ALL_VALUE);
      if (event.target.value === ALL_VALUE) {
        event.target.checked = true;
        valueInputs.forEach((input) => {
          input.checked = false;
        });
      } else {
        if (event.target.checked && allInput) allInput.checked = false;
        if (!valueInputs.some((input) => input.checked) && allInput) {
          allInput.checked = true;
        }
      }
      applyHandler();
    };
  }

  function updateFilterLabels() {
    [
      ["category", state.categories],
      ["status", state.statuses],
      ["month", state.months],
    ].forEach(([name, values]) => {
      const label = document.querySelector(`#${name}-filter-label`);
      const prefix = {
        category: "Kategori",
        status: "Status",
        month: "Periode",
      }[name];
      label.textContent = values.size
        ? `${prefix}: ${values.size} dipilih`
        : `${prefix}: Semua`;
    });
  }

  function applyFilters() {
    state.categories = selected(".category-check");
    state.statuses = selected(".status-check");
    state.months = selected(".month-check");
    syncAllCheckbox(".category-check");
    syncAllCheckbox(".status-check");
    syncAllCheckbox(".month-check");
    const query = state.query.toLowerCase();
    state.filtered = state.all
      .filter((item) => {
        const categories = (item.category || "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        const status = competitionStatus(item.deadline).label;
        const date = safeDate(item.deadline);
        const month = date?.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });
        return (
          (!query ||
            `${item.title} ${item.organizer}`.toLowerCase().includes(query)) &&
          (!state.categories.size ||
            categories.some((value) => state.categories.has(value))) &&
          (!state.statuses.size || state.statuses.has(status)) &&
          (!state.months.size || state.months.has(month))
        );
      })
      .sort((a, b) => {
        const aStatus = competitionStatus(a.deadline);
        const bStatus = competitionStatus(b.deadline);
        if (aStatus.expired && !bStatus.expired) return 1;
        if (!aStatus.expired && bStatus.expired) return -1;
        const aDate = dateTime(a.deadline);
        const bDate = dateTime(b.deadline);
        if (aDate === null && bDate === null) return 0;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return state.sort === "asc" ? aDate - bDate : bDate - aDate;
      });
    state.page = 1;
    updateFilterLabels();
    render();
  }

  function createDetailSection(iconName, heading, children, modifier = "") {
    const section = document.createElement("section");
    section.className = "detail-section";
    const title = document.createElement("h3");
    title.append(createIcon(`${iconName} icon-gap`), document.createTextNode(heading));
    const box = document.createElement("div");
    box.className = `detail-box${modifier ? ` ${modifier}` : ""}`;
    if (Array.isArray(children)) box.append(...children);
    else box.append(children);
    section.append(title, box);
    return section;
  }

  function openDetail(item, opener) {
    modalBody.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "detail-grid";
    const image = document.createElement("img");
    image.className = "modal-poster";
    image.alt = `Poster lomba ${item.title || "tanpa judul"}`;
    image.src = getSafeUrl(item.poster, {
      purpose: "image",
      fallback: CONFIG.defaultPoster,
    });
    image.addEventListener(
      "error",
      () => {
        image.src = CONFIG.defaultPoster;
      },
      { once: true },
    );

    const content = document.createElement("div");
    content.className = "detail-content";
    const title = document.createElement("h2");
    title.textContent = item.title || "Detail Lomba";

    const summary = document.createElement("div");
    summary.className = "detail-summary";
    const organizer = document.createElement("div");
    organizer.className = "detail-summary-item";
    const organizerIcon = document.createElement("span");
    organizerIcon.className = "detail-icon blue";
    organizerIcon.append(createIcon("fa-solid fa-building"));
    const organizerText = document.createElement("div");
    organizerText.append(Object.assign(document.createElement("span"), {
      className: "detail-kicker",
      textContent: "Penyelenggara",
    }));
    const organizerValue = document.createElement("span");
    organizerValue.className = "detail-value";
    organizerValue.textContent = item.organizer || "-";
    const scale = document.createElement("span");
    scale.className = "detail-scale";
    scale.append(
      createIcon("fa-solid fa-globe"),
      document.createTextNode(item.scale || "Umum"),
    );
    organizerText.append(organizerValue, scale);
    organizer.append(organizerIcon, organizerText);

    const fee = document.createElement("div");
    fee.className = "detail-summary-item";
    const feeIcon = document.createElement("span");
    feeIcon.className = "detail-icon green";
    feeIcon.append(createIcon("fa-solid fa-money-bill-wave"));
    const feeText = document.createElement("div");
    feeText.append(Object.assign(document.createElement("span"), {
      className: "detail-kicker",
      textContent: "Biaya / Fee",
    }));
    feeText.append(Object.assign(document.createElement("span"), {
      className: "detail-value",
      textContent: item.fee || "Gratis",
    }));
    fee.append(feeIcon, feeText);
    summary.append(organizer, fee);

    const themeText = document.createElement("p");
    themeText.textContent = item.theme || "-";

    const timeline = document.createElement("div");
    const timelineText = document.createElement("p");
    timelineText.textContent = item.timeline || "-";
    const deadlineRow = document.createElement("div");
    deadlineRow.className = "deadline-row";
    const deadlineLabel = document.createElement("span");
    deadlineLabel.textContent = "Batas Pendaftaran";
    const deadlinePill = document.createElement("span");
    deadlinePill.className = "deadline-pill";
    deadlinePill.append(
      createIcon("fa-solid fa-calendar-days"),
      document.createTextNode(
        formatDate(item.deadline, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ),
    );
    deadlineRow.append(deadlineLabel, deadlinePill);
    timeline.append(timelineText, deadlineRow);

    const info = document.createElement("div");
    info.className = "linkified";
    appendLinkified(info, item.infoLinks);

    content.append(
      title,
      summary,
      createDetailSection(
        "fa-solid fa-book-open",
        "Tema & Subtema",
        themeText,
      ),
      createDetailSection(
        "fa-solid fa-calendar-clock",
        "Timeline Lomba",
        timeline,
        "timeline-box",
      ),
      createDetailSection(
        "fa-solid fa-link",
        "Link Informasi / Guidebook",
        info,
        "link-box",
      ),
    );
    wrapper.append(image, content);
    modalBody.append(wrapper);
    openModal(detailModal, opener);
  }

  function render(options = {}) {
    const { restoreFocus = false, focusTarget = "grid" } = options;
    grid.replaceChildren();
    count.textContent = `${state.filtered.length} lomba`;
    if (!state.filtered.length) {
      grid.append(
        createState("empty", "Coba gunakan kata kunci atau filter lain."),
      );
      pagination.hidden = true;
      return;
    }
    const totalPages = Math.ceil(state.filtered.length / pageSize);
    state.page = Math.min(state.page, totalPages);
    state.filtered
      .slice((state.page - 1) * pageSize, state.page * pageSize)
      .forEach((item) => {
        const status = competitionStatus(item.deadline);
        const card = document.createElement("article");
        card.className = `card competition-card is-${status.className}${status.expired ? " expired" : ""}`;
        const posterButton = document.createElement("button");
        posterButton.type = "button";
        posterButton.className = "poster-button";
        posterButton.setAttribute(
          "aria-label",
          `Lihat detail ${item.title || "lomba"}`,
        );
        const image = document.createElement("img");
        image.alt = `Poster lomba ${item.title || "tanpa judul"}`;
        image.loading = "lazy";
        image.src = getSafeUrl(item.poster, {
          purpose: "image",
          fallback: CONFIG.defaultPoster,
        });
        image.addEventListener(
          "error",
          () => {
            image.src = CONFIG.defaultPoster;
          },
          { once: true },
        );
        const statusBadge = document.createElement("span");
        statusBadge.className = `card-overlay card-status is-${status.className}`;
        statusBadge.textContent = status.label;
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "card-overlay card-category";
        categoryBadge.append(
          createIcon("fa-solid fa-tag"),
          document.createTextNode(item.category || "Lomba"),
        );
        posterButton.append(image, statusBadge, categoryBadge);
        posterButton.addEventListener("click", () =>
          openDetail(item, posterButton),
        );

        const body = document.createElement("div");
        body.className = "competition-body";
        const title = document.createElement("h3");
        title.textContent = item.title || "Lomba tanpa judul";

        const meta = document.createElement("div");
        meta.className = "competition-meta";
        const organizer = document.createElement("div");
        organizer.className = "organizer-text";
        organizer.append(
          createIcon("fa-solid fa-building"),
          document.createTextNode(item.organizer || "-"),
        );
        const scale = document.createElement("span");
        scale.className = "scale-pill";
        scale.append(
          createIcon("fa-solid fa-globe"),
          document.createTextNode(item.scale || "Nasional"),
        );
        meta.append(organizer, scale);

        const facts = document.createElement("div");
        facts.className = "competition-facts";
        const feeFact = document.createElement("div");
        feeFact.className = "competition-fact";
        const feeLabel = document.createElement("span");
        feeLabel.className = "fact-label";
        feeLabel.append(
          createIcon("fa-solid fa-money-bill-wave"),
          document.createTextNode("Fee"),
        );
        const feeValue = document.createElement("span");
        feeValue.className = "fact-value";
        feeValue.textContent = item.fee || "Free";
        feeFact.append(feeLabel, feeValue);

        const deadlineFact = document.createElement("div");
        deadlineFact.className = "competition-fact";
        const deadlineLabel = document.createElement("span");
        deadlineLabel.className = "fact-label";
        deadlineLabel.append(
          createIcon("fa-solid fa-calendar"),
          document.createTextNode("Deadline"),
        );
        const deadlineValue = document.createElement("span");
        deadlineValue.className = "fact-value";
        deadlineValue.textContent = formatDate(item.deadline, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        deadlineFact.append(deadlineLabel, deadlineValue);
        facts.append(feeFact, deadlineFact);

        const detailButton = document.createElement("button");
        detailButton.type = "button";
        detailButton.className = "btn card-action";
        detailButton.append(
          createIcon("fa-solid fa-eye"),
          document.createTextNode("Lihat Detail Lengkap"),
        );
        detailButton.addEventListener("click", () =>
          openDetail(item, detailButton),
        );
        body.append(title, meta, facts, detailButton);
        card.append(posterButton, body);
        grid.append(card);
        revealElement(card, grid.children.length - 1);
      });
    pagination.hidden = totalPages <= 1;
    document.querySelector("#page-info").textContent =
      `Halaman ${state.page} dari ${totalPages}`;
    const prevButton = document.querySelector("#prev-page");
    const nextButton = document.querySelector("#next-page");
    prevButton.disabled = state.page === 1;
    nextButton.disabled = state.page === totalPages;
    if (restoreFocus) {
      document.querySelector("#competition-heading")?.scrollIntoView({
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

  async function load() {
    grid.replaceChildren(
      createState("loading", "Mengambil informasi lomba terbaru."),
    );
    pagination.hidden = true;
    try {
      const data = await fetchWithTimeout(CONFIG.competitionUrl, "json");
      if (!Array.isArray(data))
        throw new FetchError("format", "Data lomba bukan berupa daftar.");
      state.all = data
        .filter((item) => item && typeof item === "object")
        .map((item, index) => ({
          id: String(item.id ?? index),
          title: String(item.title ?? ""),
          theme: String(item.theme ?? ""),
          category: String(item.category ?? ""),
          poster: String(item.poster ?? ""),
          deadline: String(item.deadline ?? ""),
          organizer: String(item.organizer ?? ""),
          fee: String(item.fee ?? ""),
          scale: String(item.scale ?? ""),
          timeline: String(item.timeline ?? ""),
          infoLinks: String(item.infoLinks ?? ""),
        }));
      const categories = [
        ...new Set(
          state.all
            .flatMap((item) =>
              item.category.split(",").map((value) => value.trim()),
            )
            .filter(Boolean),
        ),
      ].sort();
      const months = [
        ...new Map(
          state.all
            .map((item) => {
              const date = safeDate(item.deadline);
              if (!date) return null;
              const label = date.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              });
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              return [key, label];
            })
            .filter(Boolean),
        ).values(),
      ];
      buildCheckOptions(
        document.querySelector("#category-filter-panel"),
        categories,
        "category",
        "Semua Kategori",
        handleFilterChange(".category-check", applyFilters),
      );
      buildCheckOptions(
        document.querySelector("#status-filter-panel"),
        ["Buka", "Segera Berakhir", "Sudah Lewat"],
        "status",
        "Semua Status",
        handleFilterChange(".status-check", applyFilters),
      );
      buildCheckOptions(
        document.querySelector("#month-filter-panel"),
        months,
        "month",
        "Semua Periode",
        handleFilterChange(".month-check", applyFilters),
      );
      state.filtered = [...state.all];
      applyFilters();
    } catch (error) {
      grid.replaceChildren(createState("error", describeError(error), load));
      count.textContent = "0 lomba";
    }
  }

  search.addEventListener("input", () => {
    state.query = search.value;
    applyFilters();
  });
  sort.addEventListener("change", () => {
    state.sort = sort.value;
    applyFilters();
  });
  sort.value = state.sort;
  document.querySelector("#prev-page").addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      render({ restoreFocus: true, focusTarget: "prev" });
    }
  });
  document.querySelector("#next-page").addEventListener("click", () => {
    if (state.page < Math.ceil(state.filtered.length / pageSize)) {
      state.page += 1;
      render({ restoreFocus: true, focusTarget: "next" });
    }
  });
  initFilterDropdowns();
  load();
}
