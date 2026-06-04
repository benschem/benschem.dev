# Rewrite

---

## MVP — ship v2

### Deploy plumbing (Netlify)

[ ] import repo into Netlify (build settings come from `netlify.toml`)
[ ] set production branch = master; enable deploy previews for branches/PRs
[ ] branch-deploy v2; verify on \*--<site>.netlify.app

### Layout shell

[x] lang attribute
[x] viewport meta
[x] charset
[x] theme-color meta
[x] color-scheme css property
[x] canonical link tag per page
[x] title per page
[x] description meta per page
[x] prevent FOUC on theme

### Content collection

[x] posts collection zod schema
[x] title field
[x] description field
[x] published field
[x] updated field
[x] changelog[] field
[x] draft? field
[x] [slug].astro post template
[x] one real post written end-to-end
[x] typography for post body
[x] syntax highlighting (shiki default)
[x] changelog rendered on post page
[x] updated date shown when differs from published

### Post index

[x] /posts page
[x] sort by published desc
[x] filter draft
[x] show title + date + description

### Homepage

[x] new bio/intro
[x] drop "clients say / students say" framing
[x] latest posts list
[x] connect / social links

### Other pages

[x] 404 page

### RSS / SEO

[x] rss feed
[x] rss autodiscovery link in head
[x] sitemap
[x] robots.txt with sitemap line
[x] og:title
[x] og:description
[x] og:image (sitewide default)
[x] og:type
[x] og:url
[x] twitter:card summary_large_image

### Favicons

[ ] favicon.svg
[x] favicon.ico
[ ] apple-touch-icon

### Security headers (\_headers file)

[x] content-security-policy
[x] strict-transport-security
[x] x-content-type-options nosniff
[x] referrer-policy
[x] permissions-policy

### Performance

[x] explicit width/height on imgs
[x] loading=lazy below fold

### Accessibility

[ ] visible focus styles
[ ] heading hierarchy never skips
[ ] color contrast WCAG AA
[x] prefers-reduced-motion respected
[ ] alt text on all images
[x] skip-link works
[ ] keyboard tab through all pages

### Pre-launch

[ ] lighthouse pass on preview deploy
[ ] keyboard-only walkthrough
[ ] og image renders in slack/imessage paste test
[ ] view source self-review

### Cutover (GitHub Pages → Netlify)

[ ] run pre-launch checks on the v2 Netlify preview (lighthouse, keyboard, view-source)
[ ] merge v2 to master with --no-ff (triggers Netlify production deploy)
[ ] verify on <site>.netlify.app
[ ] add custom domain benschem.dev (+ www) in Netlify Domain settings
[ ] repoint DNS off GitHub Pages (delegate to Netlify DNS, or set apex A/ALIAS + www CNAME per Netlify's panel)
[ ] wait for Netlify Let's Encrypt cert
[ ] verify benschem.dev serves new site
[ ] check from cellular / off-wifi
[ ] disable github pages in repo settings (Settings → Pages → None)
[ ] delete CNAME file on master (GH Pages artifact)
[ ] confirm which branch Pages deployed from, then delete stale gh-pages branch (local + origin)
[ ] delete v2 branch (local + origin)
[ ] submit https://benschem.dev/sitemap-index.xml to google search console

---

## Eventually — post-launch polish

### Setup polish

[ ] engines in package.json
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

[x] /uses
[ ] /now

### SEO extras

[ ] json-ld BlogPosting on posts
[ ] json-ld Person on home
[ ] og image generation per post at build time

### Favicons extras

[ ] site.webmanifest

### Root files

[ ] humans.txt
[ ] /.well-known/security.txt
[ ] \_redirects (if needed for old urls)

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

### Polish

[ ] view transitions
[ ] rel="me" links
[ ] back-to-top

### Obscure / on-brand additions

[ ] microformats2 (h-card on bio, h-entry on posts)
[ ] webfinger at /.well-known/webfinger
[ ] /colophon page
[ ] /privacy page
[ ] /llms.txt
[ ] CAA dns records
[ ] 88x31 site button
[ ] join a webring

---

## Cutover commands (exact order)

Netlify auto-deploys `master` on push (production) once the repo is imported, so the
merge below is what triggers the production build — no manual deploy step.

```
git checkout master
git merge --no-ff v2 -m "Rewrite site as Astro blog"
git tag -a v2.0 -m "Astro rewrite launch"
git push origin master --follow-tags
```
