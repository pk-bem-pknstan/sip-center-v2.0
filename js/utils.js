export const CONFIG = {
  timeout: 12000,
  defaultPoster:
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800",
  competitionUrl:
    "https://script.google.com/macros/s/AKfycbwaP8SbqAX8JWt7Ck5ClaWaNbNZ_GPQPP211roSvobIkIeCJQ5uE_fnY5xlT5se4dZoVw/exec",
  regulationUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdrNLvr8K6w61u4u_TfL_85FGnbeTfyRbnVHnvfdE4UV9yw4nEnNNq7Sr947zPIIQWiVvv_3zqKj/pub?gid=904917174&output=csv",
  ktiUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT_1Saug5gRlQ-rt4es9uVEVvJ-R-6hRetoCW1XnRsUwALiAYc99TcMbQ6pTIxDM6rfGvT7viaxg7BC/pub?output=csv",
  archiveUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLeaIeZ0MCstl7d-KmZrMCpizChnrAvNaLIEmRCL8RxF0YvHRiNaxpZ0Adqaew6eHN-bj0SBVlZL2q/pub?gid=0&single=true&output=csv",
  calendarUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvtEoAsEAi6On8t16DKSusYyR54b4TLM7C2Vb7DbMvFQALQdl2Irg98wOoSxJifp65WQWfRyq61wxG/pubhtml?gid=0&single=true",
  instagramUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlFvd32fnRQKZDeGLsAh9puJMoVTx_4cz_1AKL0rqLZk_JPRo1D9SZVQw1PKyZ_fW6iTR1N3gPqGuQ/pubhtml?gid=0&single=true",
};
export const ALLOWED_HOSTS = [
  "google.com",
  "googleusercontent.com",
  "gstatic.com",
  "pknstan.ac.id",
  "unsplash.com",
  "images.unsplash.com",
  "instagram.com",
  "maps.google.com",
  "zoom.us",
  "bit.ly",
  "s.id",
  "linktr.ee",
  "fbcdn.net",
  "cdninstagram.com",
  "bempknstan.com",
];

export function createIcon(className) {
  const icon = document.createElement("i");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}
export function hostAllowed(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}
export function getSafeUrl(value, options = {}) {
  const { fallback = "", purpose = "link" } = options;
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !hostAllowed(url.hostname))
      return fallback;
    if (purpose === "image" && url.hostname === "drive.google.com") {
      const match =
        url.pathname.match(/\/file\/d\/([^/]+)/) ||
        url.search.match(/[?&]id=([^&]+)/);
      if (match)
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1000`;
    }
    if (purpose === "iframe" && url.hostname === "drive.google.com") {
      url.pathname = url.pathname.replace(/\/view\/?$/, "/preview");
    }
    return url.href;
  } catch {
    return fallback;
  }
}
export class FetchError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "FetchError";
    this.kind = kind;
  }
}
function normalizeSheetTextUrl(value, format) {
  if (format === "json" || typeof value !== "string") return value;

  try {
    const url = new URL(value.trim());
    const isPublishedSheet =
      url.hostname === "docs.google.com" &&
      url.pathname.includes("/spreadsheets/d/e/");

    if (!isPublishedSheet) return value;

    if (url.pathname.endsWith("/pubhtml")) {
      url.pathname = url.pathname.replace(/\/pubhtml$/, "/pub");
    }

    if (url.pathname.endsWith("/pub")) {
      url.searchParams.set("output", "csv");
      if (!url.searchParams.has("single")) url.searchParams.set("single", "true");
    }

    return url.href;
  } catch {
    return value;
  }
}
const CACHE_TTL = 7 * 60 * 1000;
const CACHE_PREFIX = "akspk:data:";
const ID_MONTHS = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agu: 8,
  ags: 8,
  aug: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  dec: 12,
};
function getCache(key) {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const payload = JSON.parse(cached);
    if (!payload || payload.expires <= Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}
function setCache(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        expires: Date.now() + CACHE_TTL,
        data,
      }),
    );
  } catch {
    // Cache hanya optimasi; fetch tetap berjalan jika storage penuh/diblokir.
  }
}
function buildISODate(year, month, day) {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return "";
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}
export function toISODate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return buildISODate(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }
  if (typeof value !== "string") return "";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,/g, "");
  if (!normalized) return "";
  const isoDateTimeMatch = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})t\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:z|[+-]\d{2}:?\d{2})?$/,
  );
  if (isoDateTimeMatch) {
    const date = new Date(value.trim());
    if (!Number.isNaN(date.getTime())) {
      return buildISODate(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
    }
    return buildISODate(
      Number(isoDateTimeMatch[1]),
      Number(isoDateTimeMatch[2]),
      Number(isoDateTimeMatch[3]),
    );
  }
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return buildISODate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }
  const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (localMatch) {
    const rawYear = Number(localMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return buildISODate(year, Number(localMatch[2]), Number(localMatch[1]));
  }
  const idMonthMatch = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/);
  if (idMonthMatch) {
    const rawYear = Number(idMonthMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const month = ID_MONTHS[idMonthMatch[2]];
    return month ? buildISODate(year, month, Number(idMonthMatch[1])) : "";
  }

  // Menjaga kompatibilitas parser kalender lama untuk format tanggal yang
  // masih dapat dipahami Date, setelah format eksplisit di atas diperiksa.
  const parsed = new Date(value.trim());
  if (!Number.isNaN(parsed.getTime())) {
    return buildISODate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }

  return "";
}
export async function fetchWithTimeout(url, format) {
  const normalizedUrl = normalizeSheetTextUrl(url, format);
  const safeUrl = getSafeUrl(normalizedUrl);
  if (!safeUrl) throw new FetchError("url", "Alamat sumber data tidak valid.");
  const responseFormat = format === "json" ? "json" : "text";
  const cacheKey = `${CACHE_PREFIX}${responseFormat}:${safeUrl}`;
  const cachedData = getCache(cacheKey);
  if (cachedData !== null) return cachedData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeout);
  try {
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok)
      throw new FetchError(
        "server",
        `Server merespons dengan status ${response.status}.`,
      );
    if (responseFormat === "json") {
      try {
        const data = await response.json();
        setCache(cacheKey, data);
        return data;
      } catch {
        throw new FetchError(
          "format",
          "Format JSON dari sumber data tidak valid.",
        );
      }
    }
    const text = await response.text();
    setCache(cacheKey, text);
    return text;
  } catch (error) {
    if (error instanceof FetchError) throw error;
    if (error.name === "AbortError")
      throw new FetchError("timeout", "Permintaan melewati batas waktu.");
    throw new FetchError(
      "network",
      "Jaringan tidak tersedia atau sumber data tidak dapat dijangkau.",
    );
  } finally {
    clearTimeout(timer);
  }
}
export function parseCSV(text) {
  if (typeof text !== "string")
    throw new FetchError("format", "Data CSV bukan teks.");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      if (field.length)
        throw new FetchError(
          "format",
          "Tanda kutip CSV berada pada posisi yang tidak valid.",
        );
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted)
    throw new FetchError(
      "format",
      "Data CSV memiliki kolom berkutip yang tidak ditutup.",
    );
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}
export function createState(kind, message, retryHandler) {
  const state = document.createElement("div");
  state.className = `state state-${kind}`;
  state.setAttribute("role", kind === "error" ? "alert" : "status");
  state.setAttribute("aria-live", "polite");
  if (kind === "loading") {
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    state.append(spinner);
  } else {
    state.append(
      createIcon(
        kind === "error"
          ? "fa-solid fa-triangle-exclamation state-icon"
          : "fa-solid fa-folder-open state-icon",
      ),
    );
  }
  const heading = document.createElement("h3");
  heading.textContent =
    kind === "error"
      ? "Data belum dapat dimuat"
      : kind === "empty"
        ? "Data tidak ditemukan"
        : "Memuat data";
  const text = document.createElement("p");
  text.textContent = message;
  state.append(heading, text);
  if (retryHandler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.append(
      createIcon("fa-solid fa-rotate-right"),
      document.createTextNode("Coba Lagi"),
    );
    button.addEventListener("click", retryHandler);
    state.append(button);
  }
  return state;
}
export function describeError(error) {
  const messages = {
    server: "Sumber data sedang mengalami gangguan.",
    network: "Periksa koneksi internet, lalu coba lagi.",
    timeout: "Sumber data terlalu lama merespons.",
    format: "Data yang diterima memiliki format yang tidak dapat dibaca.",
    url: "Alamat sumber data tidak lolos pemeriksaan keamanan.",
  };
  return messages[error.kind] || "Terjadi kesalahan yang tidak terduga.";
}
export function safeDate(value) {
  const isoDate = toISODate(value);
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
