import {
  loadPartials,
  markActiveNavigation,
  initHeroDecor,
  initAnimations,
  initModals,
} from "./shared.js";
import { initSharedIcons, initNavigation } from "./header-footer.js";
import {
  initCalendar,
  initInstagramFeed,
  parseCalendarRows,
} from "./pages/home.js";
import { initServices } from "./pages/layanan.js";
import { initCompetitions } from "./pages/info-lomba.js";
import { initRegulations } from "./pages/peraturan.js";
import { initKTI } from "./pages/kti.js";
import { initArchive } from "./pages/arsip-kegiatan.js";
import { initPusatStudi } from "./pages/pusat-studi.js";
import { getSafeUrl, parseCSV, fetchWithTimeout, toISODate } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  loadPartials();
  markActiveNavigation();
  initHeroDecor();
  initAnimations();
  initSharedIcons();
  initNavigation();
  initModals();
  initCalendar();
  initInstagramFeed();
  initServices();
  initCompetitions();
  initRegulations();
  initKTI();
  initArchive();
  initPusatStudi();
});

// Menjaga kompatibilitas jika API ini digunakan secara global di masa lalu
window.SiteUtils = {
  getSafeUrl,
  parseCSV,
  fetchWithTimeout,
  parseCalendarRows,
  toISODate,
};
