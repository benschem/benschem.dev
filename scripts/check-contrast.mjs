#!/usr/bin/env node
// Audit WCAG contrast across every palette × mode in src/styles/tokens.css.
//
//   node scripts/check-contrast.mjs              all palettes (failures only)
//   node scripts/check-contrast.mjs default      one palette
//   node scripts/check-contrast.mjs --all        include passing pairs too
//   node scripts/check-contrast.mjs sky --all    full table for one palette
//
// Parses tokens.css directly, so a new :root[data-palette="..."] block is
// picked up automatically. Exits 1 when any pair fails — wire it into CI later
// if you want.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.join(__dirname, "..", "src", "styles", "tokens.css");

// ---------- tokens.css → { paletteName: { propName: cssValue } } -----------

function readPalettes() {
  const text = fs.readFileSync(TOKENS_PATH, "utf8");
  // Default's selector is `:root, :root[data-palette="default"]`; the optional
  // `:root,` group makes both forms match.
  const blockRe =
    /:root(?:\s*,\s*:root)?\[data-palette="(\w+)"\]\s*\{([^}]+)\}/g;
  const palettes = {};
  let m;
  while ((m = blockRe.exec(text))) palettes[m[1]] = parseBlock(m[2]);
  return palettes;
}

function parseBlock(body) {
  body = body.replace(/\/\*[\s\S]*?\*\//g, "");
  const props = {};
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) {
      const decl = body.slice(start, i).trim();
      if (decl) {
        const colon = decl.indexOf(":");
        const name = decl.slice(0, colon).trim().replace(/^--/, "");
        props[name] = decl.slice(colon + 1).trim();
      }
      start = i + 1;
    }
  }
  return props;
}

// ---------- CSS value → { L, C, H } for a given mode ----------------------

function resolveValue(value, mode, resolved) {
  value = value.trim();
  if (value === "white") return { L: 1, C: 0, H: 0 };
  if (value === "black") return { L: 0, C: 0, H: 0 };

  if (value.startsWith("light-dark(")) {
    const [light, dark] = splitTopLevel(unwrap("light-dark", value), ",");
    return resolveValue(mode === "light" ? light : dark, mode, resolved);
  }

  if (value.startsWith("var(")) {
    const name = value.match(/var\(--([\w-]+)\)/)[1];
    return resolved[name][mode];
  }

  if (value.startsWith("oklch(")) {
    const inner = unwrap("oklch", value).trim();
    if (inner.startsWith("from ")) {
      const rest = inner.slice(5).trim();
      const varMatch = rest.match(/^var\(--([\w-]+)\)/);
      const source = resolved[varMatch[1]][mode];
      const remainder = rest.slice(varMatch[0].length).trim();
      const [lExpr, cExpr, hExpr] = splitTopLevel(remainder, /\s+/);
      return {
        L: evalExpr(lExpr, source),
        C: evalExpr(cExpr, source),
        H: evalExpr(hExpr, source),
      };
    }
    const [lTok, cTok, hTok] = splitTopLevel(inner, /\s+/);
    return {
      L: parsePercentOrNumber(lTok),
      C: parsePercentOrNumber(cTok),
      H: parsePercentOrNumber(hTok),
    };
  }

  throw new Error(`Cannot resolve CSS value: ${value}`);
}

function unwrap(fnName, value) {
  return value.slice(fnName.length + 1, -1);
}

function evalExpr(expr, source) {
  expr = expr.trim();
  if (expr === "l") return source.L;
  if (expr === "c") return source.C;
  if (expr === "h") return source.H;
  if (expr.startsWith("calc(")) {
    const inner = unwrap("calc", expr).trim();
    const m = inner.match(/^([lch])\s*([+-])\s*([\d.]+)$/);
    if (m) {
      const base = m[1] === "l" ? source.L : m[1] === "c" ? source.C : source.H;
      const n = parseFloat(m[3]);
      return m[2] === "+" ? base + n : base - n;
    }
    const n = parseFloat(inner);
    if (!isNaN(n)) return n;
  }
  const n = parseFloat(expr);
  if (!isNaN(n)) return n;
  throw new Error(`Cannot eval channel expression: ${expr}`);
}

function splitTopLevel(str, sep) {
  const isRe = sep instanceof RegExp;
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && (isRe ? sep.test(c) : c === sep)) {
      const piece = str.slice(start, i).trim();
      if (piece) parts.push(piece);
      start = i + 1;
    }
  }
  const tail = str.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parsePercentOrNumber(s) {
  s = s.trim();
  return s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
}

function resolvePalette(props) {
  // tokens.css declares properties in dependency order; resolving in declaration
  // order means every var() reference is already in `resolved` when we hit it.
  const resolved = {};
  for (const name of Object.keys(props)) {
    resolved[name] = {
      light: resolveValue(props[name], "light", resolved),
      dark: resolveValue(props[name], "dark", resolved),
    };
  }
  return resolved;
}

// ---------- OKLCH → sRGB → WCAG luminance ----------------------------------

function oklchToLinearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  return [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

function linearToSrgb(c) {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function relLuminance(color) {
  const [r, g, b] = oklchToLinearRgb(color.L, color.C, color.H).map((v) =>
    Math.max(0, Math.min(1, v)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function srgbHex(color) {
  const [r, g, b] = oklchToLinearRgb(color.L, color.C, color.H)
    .map(linearToSrgb)
    .map((v) => Math.max(0, Math.min(1, v)));
  const to = (n) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}

function contrast(a, b) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// color-mix(in oklch, A wA, B (1-wA)) — linear blend, hue along shorter arc.
function mixOklch(a, b, wA) {
  let h2 = b.H;
  if (h2 - a.H > 180) h2 -= 360;
  if (h2 - a.H < -180) h2 += 360;
  return {
    L: a.L * wA + b.L * (1 - wA),
    C: a.C * wA + b.C * (1 - wA),
    H: (a.H * wA + h2 * (1 - wA) + 360) % 360,
  };
}

// Mirrors btn-primary's `oklch(from var(--accent) calc((0.6 - l)*1000) 0 0)` —
// out-of-range L clamps to black/white, picking whichever has higher contrast
// against the accent.
function pickInk(accent) {
  return accent.L > 0.6 ? { L: 0, C: 0, H: 0 } : { L: 1, C: 0, H: 0 };
}

// ---------- Pairs to check (one per real usage site in the components) ----

function buildPairs(resolved, mode) {
  const g = (name) => resolved[name][mode];
  const surf = g("surface-reading");
  const raised = g("surface-raised");
  const inkBody = g("ink-body");
  const inkHeading = g("ink-heading");
  const accent = g("accent");
  const accentSoft = g("accent-soft");
  const alt = g("alt");
  const altSoft = g("alt-soft");
  const altStrong = g("alt-strong");
  const codeBg = mixOklch(alt, surf, 0.15);

  // Mirrors the callout role tokens in tokens.css — keep in sync.
  const seedAccent = g("seed-accent");
  const seedRaised = g("seed-raised");
  const calloutLabelL = mode === "light" ? seedAccent.L - 0.06 : seedAccent.L;
  const calloutInfo = { L: calloutLabelL, C: 0.13, H: 245 };
  const calloutWarning = { L: calloutLabelL, C: 0.13, H: 70 };
  const calloutInfoTint = { L: seedRaised.L, C: seedRaised.C + 0.02, H: 245 };
  const calloutWarningTint = { L: seedRaised.L, C: seedRaised.C + 0.02, H: 70 };

  // Mirrors the --error form-validation token in tokens.css — keep in sync.
  const errorColor = { L: calloutLabelL, C: 0.16, H: 28 };

  return [
    ["ink-body on surface-reading (body p)", inkBody, surf, 4.5, "text"],
    [
      "ink-body on surface-raised (header/footer)",
      inkBody,
      raised,
      4.5,
      "text",
    ],
    ["ink-heading on surface-reading (h2)", inkHeading, surf, 3, "large"],
    [
      "ink-heading on surface-raised (h2 in header)",
      inkHeading,
      raised,
      3,
      "large",
    ],
    [
      "callout-info label on info tint",
      calloutInfo,
      calloutInfoTint,
      4.5,
      "text",
    ],
    [
      "callout-warning label on warning tint",
      calloutWarning,
      calloutWarningTint,
      4.5,
      "text",
    ],
    ["ink-body on callout info tint", inkBody, calloutInfoTint, 4.5, "text"],
    [
      "ink-body on callout warning tint",
      inkBody,
      calloutWarningTint,
      4.5,
      "text",
    ],
    [
      "ink-heading on callout info tint (title)",
      inkHeading,
      calloutInfoTint,
      3,
      "large",
    ],
    [
      "ink-heading on callout warning tint (title)",
      inkHeading,
      calloutWarningTint,
      3,
      "large",
    ],
    [
      "accent on surface-reading (strong/eyebrow/.go/.arrow/link hover)",
      accent,
      surf,
      4.5,
      "text",
    ],
    [
      "accent on surface-raised (strong inside header)",
      accent,
      raised,
      4.5,
      "text",
    ],
    [
      "alt on surface-reading (time/back-link/drop-cap/.sub/.meta)",
      alt,
      surf,
      4.5,
      "text",
    ],
    ["alt on surface-raised", alt, raised, 4.5, "text"],
    [
      "alt-strong on inline-code-bg (code text)",
      altStrong,
      codeBg,
      4.5,
      "text",
    ],
    ["alt-strong on alt-soft (::selection)", altStrong, altSoft, 4.5, "text"],
    [
      "alt-strong on alt-soft (btn-secondary hover)",
      altStrong,
      altSoft,
      4.5,
      "text",
    ],
    ["btn-primary ink on accent", pickInk(accent), accent, 4.5, "text"],
    [
      "btn-primary ink on accent-soft (hover)",
      pickInk(accentSoft),
      accentSoft,
      4.5,
      "text",
    ],
    [
      "ink-heading on surface-raised (TOC heading)",
      inkHeading,
      raised,
      3,
      "large",
    ],
    ["ink-body on surface-raised (TOC links)", inkBody, raised, 4.5, "text"],
    [
      "accent border vs surface-reading (pre code-block)",
      accent,
      surf,
      3,
      "ui",
    ],
    ["ink-heading focus ring vs surface-reading", inkHeading, surf, 3, "ui"],
    ["ink-heading focus ring vs surface-raised", inkHeading, raised, 3, "ui"],
    ["alt as btn-secondary border vs surface-reading", alt, surf, 3, "ui"],
    [
      "error text on surface-reading (form validation)",
      errorColor,
      surf,
      4.5,
      "text",
    ],
    ["alt as form input border vs surface-reading", alt, surf, 3, "ui"],
  ];
}

// ---------- Main -----------------------------------------------------------

const args = process.argv.slice(2);
const showAll = args.includes("--all");
const paletteArg = args.find((a) => !a.startsWith("--"));

const palettes = readPalettes();
if (paletteArg && !palettes[paletteArg]) {
  console.error(
    `Unknown palette: "${paletteArg}".\nAvailable: ${Object.keys(palettes).join(", ")}`,
  );
  process.exit(2);
}

const subset = paletteArg ? { [paletteArg]: palettes[paletteArg] } : palettes;

let totalFails = 0;
let totalPairs = 0;

for (const [pname, props] of Object.entries(subset)) {
  const resolved = resolvePalette(props);
  for (const mode of ["light", "dark"]) {
    let printedHeader = false;
    for (const [label, fg, bg, req, kind] of buildPairs(resolved, mode)) {
      totalPairs++;
      const ratio = contrast(fg, bg);
      const pass = ratio >= req;
      if (!pass) totalFails++;
      if (pass && !showAll) continue;
      if (!printedHeader) {
        console.log(`\n=== ${pname} / ${mode} ===`);
        printedHeader = true;
      }
      const mark = pass ? "PASS" : "FAIL";
      console.log(
        `  [${mark}] ${ratio.toFixed(2).padStart(5)} (need ${req}, ${kind})  ${label}   fg ${srgbHex(fg)} on bg ${srgbHex(bg)}`,
      );
    }
  }
}

const scope = paletteArg
  ? `palette "${paletteArg}"`
  : `${Object.keys(palettes).length} palettes`;
console.log(
  `\n${totalFails === 0 ? `All ${totalPairs} pairs pass for ${scope}.` : `${totalFails} of ${totalPairs} pairs FAIL for ${scope}.`}`,
);
process.exit(totalFails === 0 ? 0 : 1);
