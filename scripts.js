// Prevent errors from script trying to access missing elements
document.addEventListener("DOMContentLoaded", (event) => {

  // -------------------------------------------------------------------------------------------------------------------
  // Feather icons
  // -------------------------------------------------------------------------------------------------------------------

  // Replace all data-feather elements with corresponding SVG icons
  feather.replace();

  // Select dark mode toggle switch
  const toggle = document.querySelector("#dark-mode-toggle");
  const switchIcon = document.querySelector("#switch-icon");

  // -------------------------------------------------------------------------------------------------------------------
  // Dark mode
  // -------------------------------------------------------------------------------------------------------------------

  // Detect browser dark mode preference and style dark mode toggle switch icon to match
  const theBrowserPrefersDarkMode = () => {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  let darkMode;
  if (theBrowserPrefersDarkMode()) {
    darkMode = true;
    switchIcon.style.fill = "none";
  } else {
    darkMode = false;
    switchIcon.style.fill = "var(--color-light)";
  }

  // When the icon is clicked, toggle dark mode
  toggle.addEventListener("click", () => {
    if (darkMode) {
      turnOffDarkMode();
    } else {
      turnOnDarkMode();
    }
  });

  const turnOffDarkMode = () => {
    applyLightColors();
    darkMode = false;
    switchIcon.style.fill = "var(--color-light)";
  };

  const turnOnDarkMode = () => {
    applyDarkColors();
    darkMode = true;
    switchIcon.style.fill = "none";
  };

  const root = document.querySelector(":root");

  const applyLightColors = () => {
    root.style.setProperty("--color-alt", "var(--purple-6)");
    root.style.setProperty("--color-alt-light", "var(--purple-2)");
    root.style.setProperty("--color-light", "var(--orange-3)");
    root.style.setProperty("--color-medium", "var(--orange-4)");
    root.style.setProperty("--color-dark", "var(--orange-8)");
    root.style.setProperty("--background", "var(--purple-0)");
    root.style.setProperty("--background-alt", "var(--purple-8)");
    root.style.setProperty("--body-text", "black");
  };

  const applyDarkColors = () => {
    root.style.setProperty("--color-alt", "var(--purple-6)");
    root.style.setProperty("--color-alt-light", "var(--purple-2)");
    root.style.setProperty("--color-light", "var(--orange-3)");
    root.style.setProperty("--color-medium", "var(--orange-4)");
    root.style.setProperty("--color-dark", "var(--orange-6)");
    root.style.setProperty("--background", "var(--purple-12)");
    root.style.setProperty("--background-alt", "var(--purple-10)");
    root.style.setProperty("--body-text", "var(--purple-0)");
  };

  // -------------------------------------------------------------------------------------------------------------------
  // Downa arrow
  // -------------------------------------------------------------------------------------------------------------------

  // As soon as you scroll, hide the bouncing arrow encouraging you to scroll down
  // Prevent the bouncing arrow touching the buttons if the screen height is too small
  const buttons = document.querySelector(".buttons");
  const downArrow = document.querySelector("#down-arrow");

  const showArrow = () => {
    downArrow.style.display = "block";
  };

  const hideArrow = () => {
    downArrow.style.display = "none";
  };

  const toggleArrowVisibility = () => {
    const downArrowRect = downArrow.getBoundingClientRect();
    const buttonsRect = buttons.getBoundingClientRect();

    const scrolledAllTheWayUp = window.scrollY === 0;

    const arrowOverlapsButtons =
      downArrowRect.bottom > buttonsRect.top &&
      downArrowRect.top < buttonsRect.bottom &&
      downArrowRect.right > buttonsRect.left &&
      downArrowRect.left < buttonsRect.right;

    if (!scrolledAllTheWayUp || arrowOverlapsButtons) {
      hideArrow();
    } else {
      showArrow();
    }
  };

  toggleArrowVisibility();

  window.addEventListener("scroll", toggleArrowVisibility);
  window.addEventListener("resize", toggleArrowVisibility);
  downArrow.addEventListener("animationstart", toggleArrowVisibility);
  downArrow.addEventListener("animationend", toggleArrowVisibility);
  downArrow.addEventListener("animationiteration", toggleArrowVisibility);
});
