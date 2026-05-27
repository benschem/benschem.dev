# My personal profile and blog

A static site built with Astro.

## Structure

This project is conventional Astro:

```text
/
├── public/
│   └── images/
├── src/
│   └── components/
│   └── layouts/
│   └── pages/
│   └── posts/
├── ...
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## Commands

All commands are run from the root of the project, from a terminal:

```shell
# Install dependencies
pnpm install`

# Local dev server
pnpm dev`

# Build production site to
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
pnpm astro ...`

# Get help using the Astro CLI
pnpm astro -- --help`
```
