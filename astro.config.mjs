// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeExternalLinks from "rehype-external-links";

import { synTheme } from "./src/shiki-theme.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://benschem.dev",
  output: "static",
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
    sitemap({
      // /teapot is an easter egg - you stumble on it, you don't get a map to it
      // /thanks is the form-success page - it's noindex, so listing it in the
      // sitemap would be contradictory (and GSC flags it as an error)
      filter: (page) =>
        page !== "https://benschem.dev/teapot/" &&
        page !== "https://benschem.dev/thanks/",
    }),
  ],
  markdown: {
    shikiConfig: {
      // One custom theme whose token colours are CSS variables (--syn-*), so
      // syntax highlighting is resolved at runtime by the browser and follows
      // the live palette + light/dark mode. The --syn-* roles live in
      // tokens.css, derived from each palette's seeds. See src/shiki-theme.mjs.
      theme: synTheme,
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
  },
});
