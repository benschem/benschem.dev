// Prevent errors from script trying to access missing elements
document.addEventListener("DOMContentLoaded", (event) => {
  // -------------------------------------------------------------------------------------------------------------------
  // Feather icons
  // -------------------------------------------------------------------------------------------------------------------

  // Replace all data-feather elements with corresponding SVG icons
  feather.replace();

  // -------------------------------------------------------------------------------------------------------------------
  // Dark mode
  // -------------------------------------------------------------------------------------------------------------------

  const THEME_KEY = "theme"; // value: "light" || "dark"

  const toggle = document.querySelector("#dark-mode-toggle");
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const getSystemTheme = () => {
    return media.matches ? "dark" : "light";
  };

  const getStoredTheme = () => {
    return localStorage.getItem(THEME_KEY);
  };

  const setStoredTheme = (theme) => {
    localStorage.setItem(THEME_KEY, theme);
  };

  const initialTheme = getStoredTheme() || getSystemTheme();

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    toggle.setAttribute("aria-checked", String(theme === "dark"));
  };

  applyTheme(initialTheme);

  toggle.addEventListener("click", () => {
    const newTheme = root.dataset.theme === "dark" ? "light" : "dark";

    if (document.startViewTransition) {
      document.startViewTransition(() => applyTheme(newTheme));
    } else {
      applyTheme(newTheme);
    }

    setStoredTheme(newTheme);
  });

  media.addEventListener("change", () => {
    const theme = getSystemTheme();

    if (document.startViewTransition) {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }

    setStoredTheme(theme);
  });

  // -------------------------------------------------------------------------------------------------------------------
  // Down arrow
  // -------------------------------------------------------------------------------------------------------------------

  // As soon as you scroll, hide the bouncing arrow encouraging you to scroll down
  const downArrow = document.querySelector("#down-arrow");

  const updateArrowVisibilty = () => {
    downArrow.dataset.hidden = window.scrollY > 10;
  };

  updateArrowVisibilty();

  window.addEventListener("scroll", updateArrowVisibilty, { passive: true });

  // Prevent the bouncing arrow touching the buttons if the screen height is too small
  const buttons = document.querySelector(".buttons");

  const checkArrowOverlap = () => {
    const downArrowRect = downArrow.getBoundingClientRect();
    const buttonsRect = buttons.getBoundingClientRect();

    const arrowOverlapsButtons = downArrowRect.bottom >= buttonsRect.top && downArrowRect.top <= buttonsRect.bottom;

    if (arrowOverlapsButtons) {
      downArrow.hidden = true;
    } else {
      updateArrowVisibilty();
    }
  };

  checkArrowOverlap();

  window.addEventListener("resize", checkArrowOverlap);
  downArrow.addEventListener("animationstart", checkArrowOverlap);
  downArrow.addEventListener("animationend", checkArrowOverlap);
  downArrow.addEventListener("animationiteration", checkArrowOverlap);
});
