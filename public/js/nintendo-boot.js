// Nintendo boot sequence — fetched on demand by the Konami listener in
// BaseLayout the moment the code is entered, never before. Plays the boot
// homage (logo drop + coin chime), switches the palette, and tells the
// ThemeSwitcher to reveal the Nintendo row. (The NES/Famicom had no boot
// screen — this is an homage, not an emulation.)

export function boot() {
  localStorage.setItem("nintendo", "unlocked");
  localStorage.setItem("palette", "nintendo");

  const apply = () => {
    document.documentElement.dataset.palette = "nintendo";
    window.dispatchEvent(new CustomEvent("nintendo:unlock"));
  };

  // Reduced motion: no boot screen, just the switch (the chime isn't motion).
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    chime();
    return;
  }

  // Boot screen in the console's own colours — crimson on cream — regardless
  // of the visitor's light/dark mode.
  const style = document.createElement("style");
  style.textContent = `
    .nin-boot {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background: #f5ead8;
      transition: opacity 0.4s ease;
    }
    .nin-boot.off {
      opacity: 0;
    }
    .nin-boot p {
      margin: 0;
      font-family: "Press Start 2P", monospace;
      font-size: clamp(1rem, 4vw, 1.75rem);
      color: #a01818;
      /* steps() so the logo descends in chunky pixel increments */
      animation: nin-logo-drop 1.6s steps(24, end) both;
    }
    @keyframes nin-logo-drop {
      from { transform: translateY(-40vh); }
      to { transform: translateY(0); }
    }
  `;

  const overlay = document.createElement("div");
  overlay.className = "nin-boot";
  overlay.setAttribute("aria-hidden", "true");
  const logo = document.createElement("p");
  logo.textContent = "benschem.dev";
  overlay.append(logo);

  document.head.append(style);
  document.body.append(overlay);

  // Theme the page behind the opaque overlay, so it's already Nintendo
  // when the boot screen lifts.
  apply();

  logo.addEventListener("animationend", () => {
    chime(); // when the logo lands
    setTimeout(() => {
      overlay.classList.add("off");
      overlay.addEventListener("transitionend", () => {
        overlay.remove();
        style.remove();
      });
    }, 900);
  });
}

// The coin sound: two square-wave notes, B5 into a sustained E6.
// Synthesized, not sampled — no audio file to fetch, and it's
// period-correct anyway.
function chime() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const note = (freq, at, dur) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + dur);
  };
  note(987.77, 0, 0.08); // B5, the pickup
  note(1318.51, 0.08, 0.65); // E6, the coin
}
