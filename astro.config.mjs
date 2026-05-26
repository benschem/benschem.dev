// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: "https://benschem.dev",
  output: "static",
  devToolbar: { enabled: false },
  integrations: [mdx()],
});
