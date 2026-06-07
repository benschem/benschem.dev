# Rewrite

---

## MVP — ship v2

### Contact form (post-deploy)

[ ] verify Forms tab shows the registered `contact` form after first deploy
[ ] disable Netlify's built-in reCAPTCHA option if prompted (honeypot only, per forms standard)
[ ] add email notification for submissions (Forms → notifications)
[ ] send one real test submission end-to-end (lands in inbox + redirects to /thanks/)
[ ] test the form with JS disabled on the deployed site (should still POST to /thanks/)
[ ] add /thanks/ pageview goal in Plausible (cleanest "form completed" signal)
[ ] optional: add "Contact form submitted" custom event goal in Plausible
[ ] check Netlify's spam-filtered submissions folder once after a few weeks (false positives)

### Accessibility

[ ] visible focus styles
[ ] heading hierarchy never skips
[ ] color contrast WCAG AA
[ ] alt text on all images
[ ] keyboard tab through all pages

### Post-launch

[ ] lighthouse pass
[ ] keyboard-only walkthrough
[ ] og image renders in slack/imessage paste test
[ ] view source self-review

### Cutover (GitHub Pages → Netlify)
---

## Eventually — post-launch polish

### Setup polish

[ ] .editorconfig
[ ] TODO.md scratch file

### Content extras

[ ] tags? field
[ ] reading time

### Prose linting (Vale)

[ ] install vale (brew install vale)
[ ] .vale.ini over src/posts/\*.mdx (Google + write-good styles)
[ ] sync styles into .vale/styles (gitignore or vendor)
[ ] pnpm lint:prose script
[ ] flags condescending words (easily/simply/just/obvious) + weasel words
[ ] decide: pre-commit hook vs CI vs on-demand only

### Homepage extras

[ ] "things I've built" grid
[ ] rocketzip CTA section

### Other pages

[ ] /now

### SEO extras

[ ] og image generation per post at build time (when each post has its own image)

### Favicons extras

[ ] site.webmanifest

### Root files

[ ] humans.txt
[ ] /.well-known/security.txt
[x] \_redirects (if needed for old urls) — old /students/\* urls redirect via public/\_redirects
[ ] re-enable /students/intro-to-javascript.html redirect once intro-to-js post is published (commented out in public/\_redirects)
[ ] check if old GitHub Pages student urls also worked extensionless; add non-.html redirect variants if so

### Security polish

[ ] strict CSP: drop script-src 'unsafe-inline' via astro experimental.csp build-time hashes (meta-tag delivery — keep frame-ancestors in \_headers; both policies must agree)
[ ] submit benschem.dev to hstspreload.org (only weeks after cutover is stable — near-irreversible, locks all subdomains to https)
[ ] csp reporting via report-to + collector (probably overkill)

### Performance polish

[ ] self-host fonts woff2
[ ] preload critical font
[ ] font-display swap
[ ] avif/webp images
[ ] long cache headers on hashed assets

### Accessibility audit

[ ] axe-core scan clean
[ ] voiceover pass on home
[ ] voiceover pass on one post

### CSS extras

[ ] print stylesheet

### Obscure / on-brand additions

[ ] microformats2 (h-card on bio, h-entry on posts)
[ ] webfinger at /.well-known/webfinger
[ ] /colophon page
[ ] /llms.txt
[ ] CAA dns records
[ ] 88x31 site button
[ ] join a webring

---
