import {
  CONFIG,
  createIcon,
  createState,
  describeError,
  fetchWithTimeout,
  getSafeUrl,
  parseCSV,
} from "../utils.js";
import { openModal } from "../shared.js";

export function initArchive() {
  const root = document.querySelector("#archive-grid");
  if (!root) return;

  /*
   * Kolom Google Sheets yang digunakan:
   * judul | tanggal | kategori | deskripsi | thumbnail | foto | rekaman | dokumen
   *
   * - tanggal    : format disarankan YYYY-MM-DD
   * - thumbnail  : link file gambar Google Drive / link gambar publik
   * - foto       : beberapa link gambar dipisahkan dengan tanda | (pipe)
   *                Jika hanya ada folder Drive, link folder tetap akan tampil
   *                sebagai tombol "Buka Galeri Drive".
   * - rekaman    : link rekaman Zoom/Google Drive
   * - dokumen    : satu/beberapa link file, pisahkan dengan | (pipe)
   */

  const state = {
    data: [],
    filtered: [],
  };

  const grid = root;
  const searchEl = document.getElementById("archive-search");
  const categoryEl = document.getElementById("archive-category");
  const yearEl = document.getElementById("archive-year");
  const galleryModal = document.getElementById("gallery-modal");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryTitle = document.getElementById("gallery-title");

  function valueFrom(item, aliases) {
    for (const key of aliases) {
      if (item[key] != null && String(item[key]).trim() !== "") {
        return String(item[key]).trim();
      }
    }
    return "";
  }

  function splitLinks(value) {
    if (!value) return [];
    return value
      .split("|")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  function isDriveFolder(value) {
    const safeUrl = getSafeUrl(value);
    if (!safeUrl) return false;

    try {
      const url = new URL(safeUrl);
      return (
        url.hostname === "drive.google.com" &&
        /\/folders\//i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function getDriveFileId(value) {
    const safeUrl = getSafeUrl(value);
    if (!safeUrl) return "";

    try {
      const url = new URL(safeUrl);
      if (url.hostname !== "drive.google.com") return "";

      const pathMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = pathMatch?.[1] || url.searchParams.get("id") || "";
      return /^[a-zA-Z0-9_-]{10,}$/.test(fileId) ? fileId : "";
    } catch {
      return "";
    }
  }

  function buildImageUrl(value, size = "w1200") {
    const safeUrl = getSafeUrl(value);
    if (!safeUrl || isDriveFolder(safeUrl)) return "";

    const fileId = getDriveFileId(safeUrl);
    if (!fileId) return getSafeUrl(safeUrl, { purpose: "image" });

    return getSafeUrl(
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${size}`,
    );
  }

  function isLoadedImageValid(image, sourceUrl) {
    if (!image.naturalWidth || !image.naturalHeight) return false;

    if (!getDriveFileId(sourceUrl)) return true;

    // Thumbnail Drive untuk file non-gambar biasanya berupa ikon generik kecil.
    // Karena request thumbnail menggunakan ukuran besar, respons Drive yang tetap
    // kecil dianggap bukan dokumentasi foto yang valid.
    return Math.max(image.naturalWidth, image.naturalHeight) > 512;
  }

  function validateImage(image, sourceUrl, onInvalid) {
    let settled = false;
    const invalidate = () => {
      if (settled) return;
      settled = true;
      onInvalid();
    };

    image.addEventListener("error", invalidate, { once: true });
    image.addEventListener(
      "load",
      () => {
        if (settled) return;
        if (!isLoadedImageValid(image, sourceUrl)) {
          invalidate();
          return;
        }
        settled = true;
      },
      { once: true },
    );
  }

  function normalizeData(rows) {
    if (rows.length < 2) return [];

    const headers = rows[0].map((header) =>
      String(header || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    );

    return rows
      .slice(1)
      .map((values, index) => {
        const row = {};
        headers.forEach((header, columnIndex) => {
          row[header] = String(values[columnIndex] || "").trim();
        });

        const photosRaw = valueFrom(row, ["foto", "photos", "gallery", "galeri"]);
        const documentsRaw = valueFrom(row, [
          "dokumen",
          "documents",
          "document",
          "file",
          "berkas",
        ]);

        const thumbnailRaw = valueFrom(row, [
          "thumbnail",
          "cover",
          "sampul",
          "gambar",
        ]);
        const recordingRaw = valueFrom(row, [
          "rekaman",
          "recording",
          "zoom",
          "video",
        ]);

        return {
          id: index + 1,
          title: valueFrom(row, ["judul", "title", "nama kegiatan", "kegiatan"]),
          date: valueFrom(row, ["tanggal", "date", "tanggal kegiatan"]),
          category: valueFrom(row, ["kategori", "category", "jenis"]) || "Kegiatan",
          description: valueFrom(row, ["deskripsi", "description", "keterangan"]),
          thumbnail: getSafeUrl(thumbnailRaw),
          photos: splitLinks(photosRaw)
            .map((url) => getSafeUrl(url))
            .filter(Boolean),
          recording: getSafeUrl(recordingRaw),
          documents: splitLinks(documentsRaw)
            .map((url) => getSafeUrl(url))
            .filter(Boolean),
        };
      })
      .filter((item) => item.title);
  }

  function formatDate(value) {
    if (!value) return "Tanggal tidak dicantumkan";
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    if (Number.isNaN(safe.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(safe);
  }

  function getYear(value) {
    if (!value) return "";
    const direct = String(value).match(/\b(20\d{2})\b/);
    if (direct) return direct[1];
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : String(parsed.getFullYear());
  }

  function sortNewestFirst(items) {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime() || 0;
      const bTime = new Date(b.date || 0).getTime() || 0;
      return bTime - aTime;
    });
  }

  function closeAllCustomSelects(except = null) {
    document.querySelectorAll("[data-custom-select].is-open").forEach((wrapper) => {
      if (wrapper === except) return;
      wrapper.classList.remove("is-open");
      wrapper
        .querySelector(".archive-select-trigger")
        ?.setAttribute("aria-expanded", "false");
    });
  }

  function rebuildCustomSelect(selectEl) {
    const wrapper = selectEl.closest("[data-custom-select]");
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".archive-select-trigger");
    const valueEl = wrapper.querySelector(".archive-select-value");
    const menu = wrapper.querySelector(".archive-select-menu");
    menu.replaceChildren();

    [...selectEl.options].forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "archive-select-option";
      button.dataset.value = option.value;
      button.setAttribute("role", "option");
      button.setAttribute(
        "aria-selected",
        option.value === selectEl.value ? "true" : "false"
      );
      button.textContent = option.textContent;

      if (option.value === selectEl.value) {
        button.classList.add("is-selected");
        valueEl.textContent = option.textContent;
      }

      button.addEventListener("click", () => {
        selectEl.value = option.value;
        valueEl.textContent = option.textContent;
        menu.querySelectorAll(".archive-select-option").forEach((item) => {
          const selected = item.dataset.value === option.value;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-selected", selected ? "true" : "false");
        });
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        trigger.focus();
      });

      menu.appendChild(button);
    });
  }

  function initCustomSelect(selectEl) {
    const wrapper = selectEl.closest("[data-custom-select]");
    if (!wrapper || wrapper.dataset.ready === "true") return;

    const trigger = wrapper.querySelector(".archive-select-trigger");
    const menu = wrapper.querySelector(".archive-select-menu");
    wrapper.dataset.ready = "true";

    trigger.addEventListener("click", () => {
      const willOpen = !wrapper.classList.contains("is-open");
      closeAllCustomSelects(wrapper);
      wrapper.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) {
        menu.querySelector(".is-selected")?.focus();
      }
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!wrapper.classList.contains("is-open")) trigger.click();
      }
    });

    menu.addEventListener("keydown", (event) => {
      const options = [...menu.querySelectorAll(".archive-select-option")];
      const index = options.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        options[(index + 1 + options.length) % options.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        options[(index - 1 + options.length) % options.length]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });

    rebuildCustomSelect(selectEl);
  }

  function populateFilters() {
    const categories = [...new Set(state.data.map((item) => item.category))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "id"));

    const years = [...new Set(state.data.map((item) => getYear(item.date)))]
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a));

    categoryEl.innerHTML = '<option value="">Semua kategori</option>';
    yearEl.innerHTML = '<option value="">Semua tahun</option>';

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryEl.appendChild(option);
    });

    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearEl.appendChild(option);
    });

    rebuildCustomSelect(categoryEl);
    rebuildCustomSelect(yearEl);
  }

  function createAction({ label, icon, href, onClick, primary = false }) {
    const safeHref = href ? getSafeUrl(href) : "";
    const el = safeHref
      ? document.createElement("a")
      : document.createElement("button");
    el.className = `archive-action${primary ? " primary" : ""}`;

    if (safeHref) {
      el.href = safeHref;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    } else {
      el.type = "button";
      if (typeof onClick === "function") {
        el.addEventListener("click", onClick);
      } else {
        el.disabled = true;
        el.setAttribute("aria-disabled", "true");
      }
    }

    const iconEl = document.createElement("i");
    iconEl.className = icon;
    iconEl.setAttribute("aria-hidden", "true");

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    el.append(iconEl, labelEl);
    return el;
  }

  function openGallery(item, opener) {
    const imageLinks = item.photos.filter((url) => !isDriveFolder(url));
    const folderLinks = item.photos.filter(isDriveFolder);

    galleryTitle.textContent = `Galeri — ${item.title}`;
    galleryGrid.replaceChildren();

    imageLinks.forEach((url, index) => {
      const link = document.createElement("a");
      link.className = "gallery-item";
      link.href = getSafeUrl(url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Buka foto ${index + 1} di tab baru`);

      const img = document.createElement("img");
      const imageSource = buildImageUrl(url, "w1000");
      img.src = imageSource;
      img.alt = `${item.title} - foto ${index + 1}`;
      img.loading = "lazy";
      img.decoding = "async";
      validateImage(img, url, () => {
        img.remove();
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.classList.add("gallery-item--unavailable");
        link.setAttribute("aria-label", "Foto tidak tersedia");
        link.replaceChildren(
          createIcon("fa-regular fa-image"),
          document.createTextNode("Foto tidak tersedia"),
        );
      });

      link.appendChild(img);
      galleryGrid.appendChild(link);
    });

    folderLinks.forEach((url) => {
      const link = createAction({
        label: "Buka folder galeri di Google Drive",
        icon: "fa-brands fa-google-drive",
        href: url,
        primary: true,
      });
      link.classList.add("gallery-drive-action");
      galleryGrid.appendChild(link);
    });

    if (!imageLinks.length && !folderLinks.length) {
      galleryGrid.append(
        createState("empty", "Galeri untuk kegiatan ini belum ditambahkan."),
      );
    }

    openModal(galleryModal, opener);
  }

  function createCard(item) {
    const article = document.createElement("article");
    article.className = "archive-card";

    const cover = document.createElement("div");
    cover.className = "archive-cover";

    const createCoverFallback = () => {
      if (cover.querySelector(".archive-cover-fallback")) return;
      const fallback = document.createElement("div");
      fallback.className = "archive-cover-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.append(
        createIcon("fa-regular fa-images"),
        document.createTextNode("Dokumentasi kegiatan"),
      );
      cover.prepend(fallback);
    };

    const coverSource =
      item.thumbnail || item.photos.find((url) => !isDriveFolder(url));
    const coverImageUrl = buildImageUrl(coverSource, "w1200");

    if (coverImageUrl) {
      const img = document.createElement("img");
      img.src = coverImageUrl;
      img.alt = `Dokumentasi ${item.title}`;
      img.loading = "lazy";
      img.decoding = "async";
      validateImage(img, coverSource, () => {
        img.remove();
        createCoverFallback();
      });
      cover.appendChild(img);
    } else {
      createCoverFallback();
    }

    const category = document.createElement("span");
    category.className = "archive-category";
    const categoryText = document.createElement("span");
    categoryText.textContent = item.category;
    category.appendChild(categoryText);
    cover.appendChild(category);

    const body = document.createElement("div");
    body.className = "archive-body";

    const date = document.createElement("div");
    date.className = "archive-date";
    date.innerHTML = '<i class="fa-regular fa-calendar" aria-hidden="true"></i>';
    const dateText = document.createElement("span");
    dateText.textContent = formatDate(item.date);
    date.appendChild(dateText);

    const title = document.createElement("h3");
    title.className = "archive-title";
    title.textContent = item.title;

    const description = document.createElement("p");
    description.className = "archive-description";
    description.textContent = item.description || "Dokumentasi kegiatan Kementerian Pendidikan dan Keilmuan BEM PKN STAN.";

    const actions = document.createElement("div");
    actions.className = "archive-actions";

    if (item.photos.length) {
      const onlyFolder = item.photos.every(isDriveFolder);
      if (onlyFolder) {
        actions.appendChild(
          createAction({
            label: "Galeri Foto",
            icon: "fa-regular fa-images",
            href: item.photos[0],
            primary: true,
          })
        );
      } else {
        actions.appendChild(
          createAction({
            label: "Galeri Foto",
            icon: "fa-regular fa-images",
            onClick: (event) => openGallery(item, event.currentTarget),
            primary: true,
          })
        );
      }
    }

    if (item.recording) {
      actions.appendChild(
        createAction({
          label: "Rekaman",
          icon: "fa-solid fa-video",
          href: item.recording,
        })
      );
    }

    item.documents.forEach((url, index) => {
      actions.appendChild(
        createAction({
          label: item.documents.length > 1 ? `Dokumen ${index + 1}` : "Dokumen",
          icon: "fa-regular fa-file-lines",
          href: url,
        })
      );
    });

    if (!actions.children.length) {
      const noFile = document.createElement("span");
      noFile.className = "archive-action is-disabled";
      noFile.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>File segera tersedia</span>';
      actions.appendChild(noFile);
    }

    body.append(date, title, description, actions);
    article.append(cover, body);
    return article;
  }

  function render() {
    grid.replaceChildren();

    if (!state.filtered.length) {
      const message = state.data.length
        ? "Coba ubah kata pencarian atau filter kategori/tahun."
        : "Belum ada kegiatan yang tersedia.";
      grid.append(createState("empty", message));
      return;
    }

    state.filtered.forEach((item) => grid.appendChild(createCard(item)));
  }

  function applyFilters() {
    const query = searchEl.value.trim().toLowerCase();
    const category = categoryEl.value;
    const year = yearEl.value;

    state.filtered = state.data.filter((item) => {
      const haystack = `${item.title} ${item.category} ${item.description}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesCategory = !category || item.category === category;
      const matchesYear = !year || getYear(item.date) === year;
      return matchesQuery && matchesCategory && matchesYear;
    });

    render();
  }

  function showConfigMessage() {
    grid.replaceChildren(
      createState(
        "empty",
        "Hubungkan Google Sheets Kegiatan melalui CONFIG.archiveUrl di js/utils.js.",
      ),
    );
  }

  async function loadArchive() {
    grid.replaceChildren(
      createState("loading", "Data kegiatan sedang dibaca dari sumber data."),
    );

    if (!CONFIG.archiveUrl?.trim()) {
      showConfigMessage();
      return;
    }

    try {
      const csvText = await fetchWithTimeout(CONFIG.archiveUrl, "text");
      const rows = parseCSV(csvText);
      state.data = sortNewestFirst(normalizeData(rows));
      state.filtered = [...state.data];

      populateFilters();
      render();
    } catch (error) {
      grid.replaceChildren(
        createState("error", describeError(error), loadArchive),
      );
    }
  }

  initCustomSelect(categoryEl);
  initCustomSelect(yearEl);

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-custom-select]")) {
      closeAllCustomSelects();
    }
  });

  searchEl.addEventListener("input", applyFilters);
  categoryEl.addEventListener("change", applyFilters);
  yearEl.addEventListener("change", applyFilters);

  loadArchive();
}

