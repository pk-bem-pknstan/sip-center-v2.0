export function initPusatStudi() {
  const root = document.querySelector(".study-grid");
  if (!root) return;

  const handleMediaError = (image) => {
    image.classList.add("is-hidden");
    image.parentElement?.classList.add("media-fallback");
  };

  const handleLogoError = (image) => {
    image.hidden = true;
    const fallbackIcon = image.nextElementSibling;
    if (fallbackIcon) fallbackIcon.hidden = false;
    image.parentElement?.classList.add("logo-missing");
  };

  root.querySelectorAll(".study-card-media img").forEach((image) => {
    image.addEventListener("error", () => handleMediaError(image), {
      once: true,
    });

    if (image.complete && image.naturalWidth === 0) {
      handleMediaError(image);
    }
  });

  root.querySelectorAll(".study-card-logo img").forEach((image) => {
    image.addEventListener("error", () => handleLogoError(image), {
      once: true,
    });

    if (image.complete && image.naturalWidth === 0) {
      handleLogoError(image);
    }
  });
}
