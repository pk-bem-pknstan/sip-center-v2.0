import { revealElement } from "../shared.js";
export function initServices() {
  document.querySelectorAll(".service-card").forEach((card, index) => {
    if (!card.classList.contains("reveal")) revealElement(card, index);
  });
}
