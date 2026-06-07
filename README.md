# My personal profile and blog

A static blog built with Astro - [benschem.dev](https://benschem.dev).

## Structure

This project is conventional Astro:

```text
/
├── public/
│   ├── _headers            # Netlify headers (CSP etc.)
│   ├── _redirects          # Netlify redirects + Plausible proxy
│   ├── images/
│   └── robots.txt
├── scripts/
│   └── check-contrast.mjs  # WCAG contrast audit (pnpm check:contrast)
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/              # File-based routes
│   │   └── posts/          # /posts index + [...slug] route
│   ├── posts/              # Blog content (md/mdx)
│   ├── styles/             # reset, global, tokens (palettes)
│   ├── content.config.ts   # Posts collection + frontmatter schema
│   └── shiki-theme.mjs     # CSS-variable syntax highlighting theme
├── astro.config.mjs
└── netlify.toml            # Netlify build settings
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

Any static assets, like images, can be placed in the `public/` directory.

There's also an RSS feed at `/rss.xml`, a sitemap, a robots.txt and a 404 page. External links in posts open in a new tab.

## Writing a post

Posts are `.md` or `.mdx` files in `src/posts/` and end up at `/posts/<slug>`. The frontmatter schema is defined in `src/content.config.ts`:

```yaml
---
title: My post
description: One or two sentences used in the post list and meta tags.
published: 2026-06-04
updated: 2026-06-10 # optional
draft: true # shows up in dev, filtered out of the production build
changelog: # optional
  - date: 2026-06-10
    change: Fixed the thing
---
```

MDX posts can import components from `src/components/`, like `Callout`. See `src/posts/example-post.mdx`.

## Theming

Colour palettes live in `src/styles/tokens.css`. Each palette defines role tokens (surface, ink, accent etc) for light and dark mode, plus `--syn-*` tokens for syntax highlighting. Code blocks use a single custom Shiki theme (`src/shiki-theme.mjs`) whose colours are CSS variables, so highlighting follows the active palette at runtime instead of being baked in at build time.

After adding or changing a palette, run `pnpm check:contrast` to make sure it still passes WCAG.

## Hosting

Hosted on Netlify. Pushing to the production branch deploys automatically. Build settings are in `netlify.toml`.

Analytics is self-hosted Plausible, loaded through a first-party path (`/pa-stats/`) via `public/_redirects` so adblockers don't filter it. Security headers (CSP etc) are in `public/_headers`.

## Commands

It needs Node 22.12+ (see `.nvmrc`) and pnpm.

All commands are run from the root of the project, from a terminal:

```shell
# Install dependencies
pnpm install

# Local dev server
pnpm dev

# Build production site to dist/
pnpm build

# Preview build locally
pnpm preview

# Prettier autocorrect
pnpm format

# Prettier autocorrect dry-run
pnpm format:check

# Astro check
pnpm lint

# WCAG contrast audit across every palette × light/dark. No arg = all palettes
# (failures only). Pass a palette name to check one, `--all` to see every pair.
# Useful when adding a new theme to src/styles/tokens.css.
pnpm check:contrast
pnpm check:contrast sky
pnpm check:contrast sky --all

# Run CLI commands like `astro add`
pnpm astro ...

# Get help using the Astro CLI
pnpm astro -- --help
```
