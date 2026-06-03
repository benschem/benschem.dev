// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
  site: "https://benschem.dev",
  output: "static",
  devToolbar: { enabled: false },
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      // Emit both themes as CSS variables (no inline default). Our CSS picks
      // between them with light-dark(), which reads color-scheme — driven by
      // data-mode on <html>.
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
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
