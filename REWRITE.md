# Rewrite

---

## MVP — ship v2

### Deploy plumbing

[ ] connect cloudflare pages to repo
[ ] set v2 as preview branch
[ ] verify empty starter deploys to \*.pages.dev

### Layout shell

[ ] lang attribute
[ ] viewport meta
[ ] charset
[ ] theme-color meta
[ ] color-scheme css property
[ ] canonical link tag per page
[ ] title per page
[ ] description meta per page
[ ] prevent FOUC on theme

### Content collection

[ ] posts collection zod schema
[ ] title field
[ ] description field
[ ] published field
[ ] updated field
[ ] changelog[] field
[ ] draft? field
[ ] [slug].astro post template
[ ] one real post written end-to-end
[ ] typography for post body
[ ] syntax highlighting (shiki default)
[ ] changelog rendered on post page
[ ] updated date shown when differs from published

### Post index

[ ] /posts page
[ ] sort by published desc
[ ] filter draft
[ ] show title + date + description

### Homepage

[ ] new bio/intro
[ ] drop "clients say / students say" framing
[ ] latest posts list
[ ] connect / social links

### Other pages

[ ] 404 page

### RSS / SEO

[ ] rss feed
[ ] rss autodiscovery link in head
[ ] sitemap
[ ] robots.txt with sitemap line
[ ] og:title
[ ] og:description
[ ] og:image (sitewide default)
[ ] og:type
[ ] og:url
[ ] twitter:card summary_large_image

### Favicons

[ ] favicon.svg
[ ] favicon.ico
[ ] apple-touch-icon

### Security headers (\_headers file)

[ ] content-security-policy
[ ] strict-transport-security
[ ] x-content-type-options nosniff
[ ] referrer-policy
[ ] permissions-policy

### Performance

[ ] explicit width/height on imgs
[ ] loading=lazy below fold

### Accessibility

[ ] visible focus styles
[ ] heading hierarchy never skips
[ ] color contrast WCAG AA
[ ] prefers-reduced-motion respected
[ ] alt text on all images
[ ] skip-link works
[ ] keyboard tab through all pages

### Pre-launch

[ ] lighthouse pass on preview deploy
[ ] keyboard-only walkthrough
[ ] og image renders in slack/imessage paste test
[ ] view source self-review

### Cutover

[ ] set master as production branch in cf pages
[ ] merge v2 to master with --no-ff
[ ] verify on \*.pages.dev
[ ] add custom domain in cf pages
[ ] wait for cert provisioning
[ ] update DNS CNAME to cf
[ ] verify benschem.dev serves new site
[ ] check from cellular / off-wifi
[ ] disable github pages in repo settings
[ ] delete v2 branch (local + origin)
[ ] submit new sitemap to google search console

---

## Eventually — post-launch polish

### Setup polish

[ ] engines in package.json
[ ] .editorconfig
[ ] TODO.md scratch file

### Content extras

[ ] tags? field
[ ] reading time

### Homepage extras

[ ] "things I've built" grid
[ ] rocketzip CTA section

### Other pages

[ ] /uses
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

### Old site cleanup followups

[ ] remove CNAME file (after cutover)

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

```
git checkout master
git merge --no-ff v2 -m "Rewrite site as Astro blog"
git tag -a v2.0 -m "Astro rewrite launch"
git push origin master --follow-tags
```
