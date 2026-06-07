// A single Shiki theme whose every colour is a CSS custom property rather than
// a baked hex value. Shiki passes these `var(--syn-*)` references straight into
// the inline `style` attribute on each token span, so the actual colours are
// resolved at *runtime* by the browser — which means code highlighting follows
// the live palette (data-palette) and light/dark mode (color-scheme) for free,
// with no rebuild and no per-theme HTML bloat.
//
// The --syn-* roles are defined once in tokens.css, derived from each palette's
// seeds via OKLCH relative colour — the same trick the rest of the design uses.
// See `src/styles/tokens.css`.

/** @type {import('shiki').ThemeRegistrationRaw} */
export const synTheme = {
  name: "seed-syntax",
  // `type` is required metadata but irrelevant here: light/dark is handled by
  // the CSS variables themselves (each --syn-* is a light-dark() or a seed that
  // already flips lightness by mode), not by Shiki picking a theme.
  type: "dark",
  colors: {
    "editor.foreground": "var(--syn-fg)",
    "editor.background": "var(--syn-bg)",
  },
  settings: [
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "var(--syn-comment)" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.other",
        "storage",
        "storage.type",
        "storage.modifier",
        "variable.language", // self, this
        "keyword.operator.new",
        "keyword.operator.expression",
      ],
      settings: { foreground: "var(--syn-keyword)" },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.template",
        "punctuation.definition.string",
        "constant.other.symbol", // ruby symbols
        "meta.embedded.line.ruby", // string interpolation host
      ],
      settings: { foreground: "var(--syn-string)" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.character",
        "constant.language", // true / false / null
        "constant.other",
        "support.constant",
        "variable.other.constant",
      ],
      settings: { foreground: "var(--syn-constant)" },
    },
    {
      scope: [
        "entity.name.function",
        "entity.name.method",
        "support.function",
        "meta.function-call",
        "keyword.other.special-method", // ruby def-ish builtins
      ],
      settings: { foreground: "var(--syn-function)" },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.name.namespace",
        "entity.other.inherited-class",
        "support.type",
        "support.class",
        "entity.name.tag", // html / jsx tags
        "support.type.property-name", // css properties
      ],
      settings: { foreground: "var(--syn-type)" },
    },
    {
      scope: [
        "entity.other.attribute-name", // html attrs, css .class / #id
        "tag.attribute",
      ],
      settings: { foreground: "var(--syn-constant)" },
    },
    {
      scope: [
        "punctuation",
        "meta.brace",
        "keyword.operator",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      settings: { foreground: "var(--syn-punctuation)" },
    },
    // Markdown / prose niceties (his posts include fenced markdown).
    {
      scope: ["markup.heading", "entity.name.section"],
      settings: { foreground: "var(--syn-keyword)", fontStyle: "bold" },
    },
    {
      scope: ["markup.bold"],
      settings: { foreground: "var(--syn-constant)", fontStyle: "bold" },
    },
    {
      scope: ["markup.italic"],
      settings: { foreground: "var(--syn-string)", fontStyle: "italic" },
    },
    {
      scope: ["markup.inline.raw", "markup.fenced_code"],
      settings: { foreground: "var(--syn-string)" },
    },
    {
      scope: ["markup.underline.link", "string.other.link"],
      settings: { foreground: "var(--syn-function)" },
    },
  ],
};
