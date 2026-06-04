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
  integrations: [mdx(), sitemap()],
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
