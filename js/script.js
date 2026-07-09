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
  toISODate,
} from "./pages/home.js";
import { initServices } from "./pages/layanan.js";
import { initCompetitions } from "./pages/info-lomba.js";
import { initRegulations } from "./pages/peraturan.js";
import { initKTI } from "./pages/kti.js";
import { getSafeUrl, parseCSV, fetchWithTimeout } from "./utils.js";

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
});

// Menjaga kompatibilitas jika API ini digunakan secara global di masa lalu
window.SiteUtils = {
  getSafeUrl,
  parseCSV,
  fetchWithTimeout,
  parseCalendarRows,
  toISODate,
};
