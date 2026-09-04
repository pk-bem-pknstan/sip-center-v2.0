import {
  CONFIG,
  parseCSV,
  fetchWithTimeout,
  createState,
  getSafeUrl,
  toISODate,
} from "../utils.js";

const CALENDAR_COLUMNS = {
  start: [
    "start",
    "tanggal_mulai",
    "mulai",
    "awal",
    "start_date",
    "tanggal_awal",
  ],
  end: [
    "end",
    "tanggal_selesai",
    "selesai",
    "akhir",
    "end_date",
    "tanggal_akhir",
  ],
  title: ["title", "judul", "kegiatan", "agenda", "nama_kegiatan"],
  desc: ["desc", "deskripsi", "description", "keterangan", "jenis_kegiatan"],
  type: ["type", "jenis", "kategori", "tipe", "warna"],
};
const CALENDAR_TYPE_ALIASES = {
  kuliah: "kuliah",
  perkuliahan: "kuliah",
  akademik: "kuliah",
  libur: "libur",
  holiday: "libur",
  ujian: "uas",
  uts: "uas",
  uas: "uas",
  pengumuman: "pengumuman",
  announcement: "pengumuman",
  lomba: "lomba",
  competition: "lomba",
  kompetisi: "lomba",
  pendaftaran_lomba: "lomba",
};
const LOMBA_PALETTES = ["rose", "lime", "blend", "teal"];

function normalizeColumnName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function readCalendarValue(record, key) {
  const aliases = CALENDAR_COLUMNS[key] || [];
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && String(value).trim())
      return String(value).trim();
  }
  return "";
}
function normalizeCalendarType(value) {
  const key = normalizeColumnName(value);
  return CALENDAR_TYPE_ALIASES[key] || "kuliah";
}
export function parseCalendarRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeColumnName);
  return rows
    .slice(1)
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });
      const start = toISODate(readCalendarValue(record, "start"));
      const end = toISODate(readCalendarValue(record, "end")) || start;
      if (!start) return null;
      return {
        start: start <= end ? start : end,
        end: start <= end ? end : start,
        title: readCalendarValue(record, "title") || "Kegiatan Akademik",
        desc: readCalendarValue(record, "desc") || "-",
        type: normalizeCalendarType(readCalendarValue(record, "type")),
      };
    })
    .filter(Boolean);
}
export function initCalendar() {
  const calendar = document.querySelector("#calendar");
  if (!calendar) return;
  const agenda = document.querySelector("#agendaList");
  const heading = document.querySelector("#monthYear");
  let currentDate = new Date();
  let calendarEvents = [];
  const iso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const display = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const agendaTagText = (event) =>
    ({
      lomba: "Lomba",
      uas: "Ujian",
      libur: "Libur",
      pengumuman: "Pengumuman",
    })[event.type] ||
    event.tag ||
    "Akademik";

  function render() {
    calendar.replaceChildren();
    agenda.replaceChildren();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    heading.textContent = currentDate.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].forEach((name) => {
      const cell = document.createElement("div");
      cell.className = "day-name";
      cell.textContent = name;
      calendar.append(cell);
    });
    for (let i = 0; i < new Date(year, month, 1).getDay(); i += 1) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "day-empty";
      emptyCell.setAttribute("aria-hidden", "true");
      calendar.append(emptyCell);
    }
    const today = new Date();
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day += 1) {
      const date = new Date(year, month, day);
      const dateKey = iso(date);
      const dayEvents = calendarEvents.filter(
        (item) => dateKey >= item.start && dateKey <= item.end,
      );
      const primaryEvent =
        dayEvents.find((item) => item.type === "lomba") || dayEvents[0];
      const cell = document.createElement("div");
      cell.className = "day";
      if (date.getDay() === 0) cell.classList.add("sunday");
      if (primaryEvent) cell.classList.add(`${primaryEvent.type}-highlight`);
      if (date.toDateString() === today.toDateString())
        cell.classList.add("today");
      if (dayEvents.length)
        cell.title = dayEvents.map((item) => item.title).join(" | ");
      const number = document.createElement("span");
      number.className = "date-number";
      number.textContent = day;
      cell.append(number);
      calendar.append(cell);
    }
    const monthEvents = calendarEvents
      .filter(
        (event) =>
          new Date(`${event.start}T00:00:00`) <= new Date(year, month + 1, 0) &&
          new Date(`${event.end}T00:00:00`) >= new Date(year, month, 1),
      )
      .sort(
        (a, b) =>
          a.start.localeCompare(b.start) || (a.type === "lomba" ? -1 : 1),
      );
    if (!monthEvents.length) {
      agenda.append(createState("empty", "Tidak ada agenda pada bulan ini."));
    } else {
      monthEvents.forEach((event) => {
        const card = document.createElement("article");
        card.className = `agenda-card agenda-${event.type}`;
        if (event.type === "lomba" && event.palette)
          card.classList.add(`agenda-lomba-${event.palette}`);
        const dates = document.createElement("small");
        dates.textContent =
          event.start === event.end
            ? display(event.start)
            : `${display(event.start)} – ${display(event.end)}`;
        const tag = document.createElement("span");
        tag.className =
          event.type === "lomba" ? "agenda-tag lomba-tag" : "agenda-tag";
        tag.textContent = agendaTagText(event);
        const title = document.createElement("strong");
        title.textContent = event.title;
        const description = document.createElement("span");
        description.textContent = event.desc;
        card.append(dates, tag, title, description);
        agenda.append(card);
      });
    }
  }
  document.querySelector("#prevMonthBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  });
  document.querySelector("#nextMonthBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  });
  render();
  async function loadCalendarData() {
    if (!CONFIG.calendarUrl.trim()) return;
    try {
      const rows = parseCSV(await fetchWithTimeout(CONFIG.calendarUrl, "text"));
      const loadedEvents = parseCalendarRows(rows);
      if (!loadedEvents.length)
        throw new FetchError(
          "format",
          "Data kalender kosong atau kolomnya tidak sesuai.",
        );
      calendarEvents = loadedEvents.map((event, index) => ({
        ...event,
        source: event.type === "lomba" ? "lomba" : "akademik",
        tag: event.type === "lomba" ? "Lomba" : "Akademik",
        palette:
          event.type === "lomba"
            ? LOMBA_PALETTES[index % LOMBA_PALETTES.length]
            : event.palette,
      }));
      render();
    } catch (error) {
      console.warn("Data kalender gagal dimuat.", error);
    }
  }
  loadCalendarData();
}

const INSTAGRAM_COLUMNS = {
  html: ["html", "kode", "embed", "sbi_photo", "source"],
  url: ["url", "link", "href", "post", "post_url", "instagram", "instagram_url"],
  image: [
    "image",
    "gambar",
    "foto",
    "thumbnail",
    "thumb",
    "src",
    "image_url",
    "data_full_res",
    "data-full-res",
  ],
  title: ["title", "judul", "caption", "alt", "deskripsi"],
  active: ["active", "aktif", "show", "tampil", "publish"],
  order: ["order", "urutan", "sort", "no", "nomor"],
};
const INSTAGRAM_MAX_ITEMS = 3;

function readInstagramValue(record, key) {
  const aliases = INSTAGRAM_COLUMNS[key] || [];
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function parseInstagramHtml(html) {
  if (!html || typeof DOMParser === "undefined") return {};

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector("a[href]");
    const image = doc.querySelector("img[src]");
    const screenreader = doc.querySelector(".sbi-screenreader");

    return {
      url: link?.getAttribute("href") || "",
      image:
        link?.getAttribute("data-full-res") ||
        link?.dataset?.fullRes ||
        image?.getAttribute("src") ||
        "",
      title:
        image?.getAttribute("alt") ||
        screenreader?.textContent?.trim() ||
        "",
    };
  } catch {
    return {};
  }
}

function parseInstagramRows(rows) {
  if (!rows.length) return [];

  const headers = rows[0].map(normalizeColumnName);

  return rows
    .slice(1)
    .map((row, index) => {
      const record = {};
      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex] || "";
      });

      const htmlData = parseInstagramHtml(readInstagramValue(record, "html"));
      const rawActive = readInstagramValue(record, "active").toLowerCase();
      const active = !["false", "0", "no", "tidak", "nonaktif"].includes(
        rawActive,
      );
      const order = Number(readInstagramValue(record, "order")) || index + 1;
      const rawUrl = readInstagramValue(record, "url") || htmlData.url;
      const rawImage = readInstagramValue(record, "image") || htmlData.image;
      const url = getSafeUrl(rawUrl);
      const image = getSafeUrl(rawImage, { purpose: "image" });

      if (!active || !url || !image) return null;

      return {
        order,
        url,
        image,
        title:
          readInstagramValue(record, "title") ||
          htmlData.title ||
          `Konten Instagram ${index + 1}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .slice(0, INSTAGRAM_MAX_ITEMS);
}

function renderInstagramPosts(grid, posts) {
  grid.replaceChildren();

  if (!posts.length) {
    grid.append(
      createState(
        "empty",
        "Belum ada konten Instagram aktif di sumber data.",
      ),
    );
    return;
  }

  posts.forEach((post, index) => {
    const link = document.createElement("a");
    link.className = "instagram-photo";
    link.href = post.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer nofollow";
    link.setAttribute(
      "aria-label",
      post.title || `Buka konten Instagram ${index + 1}`,
    );

    const image = document.createElement("img");
    image.src = post.image;
    image.alt = post.title || `Konten Instagram ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    const overlay = document.createElement("span");
    overlay.className = "instagram-photo-overlay";
    overlay.innerHTML =
      '<i class="fa-brands fa-instagram" aria-hidden="true"></i><span>Lihat di Instagram</span>';

    link.append(image, overlay);
    grid.append(link);
  });
}

export async function initInstagramFeed() {
  const grid = document.querySelector("#instagramFeedGrid");
  if (!grid) return;

  const sourceUrl = CONFIG.instagramUrl || "";

  if (!sourceUrl.trim()) {
    grid.replaceChildren(
      createState(
        "empty",
        "Hubungkan Google Sheet Instagram di CONFIG.instagramUrl.",
      ),
    );
    return;
  }

  grid.replaceChildren(
    createState("loading", "Memuat konten Instagram terbaru..."),
  );

  try {
    const rows = parseCSV(await fetchWithTimeout(sourceUrl, "text"));
    renderInstagramPosts(grid, parseInstagramRows(rows));
  } catch (error) {
    console.warn("Feed Instagram gagal dimuat.", error);
    grid.replaceChildren(
      createState(
        "error",
        "Feed Instagram belum dapat dimuat. Periksa link CSV Google Sheet dan format kolom.",
        () => initInstagramFeed(),
      ),
    );
  }
}
