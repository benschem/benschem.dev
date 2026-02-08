# Ben's Profile Page

An intentionally simple static website - plain HTML and vanilla CSS, with a sprinkling of Javascript.
It's [hosted](https://benschem.dev) on Github pages because it's free and easy.

```
index.html
styles.css
scripts.js
```

### Javascript

Used for progressive enhancement:

- Loads an external script to render the footer icons
- Handles the dark mode toggle
- Handles the "scroll down" arrow.

### CSS

- Vanilla CSS
- Semantic styling rather than utility classes
- A normalise section

### The icons

The social icons in the footer use [Feather Icons](https://github.com/feathericons/feather).

- Open source project
- Call it with `feather.replace()`
- Replaces elements that have a `data-feather` attribute with a corresponding SVG icon

Downsides of this are negligble/none as the script loading is deferred, the CDN is plenty fast enough, and given the icons are in the footer - no impact to the user.

## What are all those other files?

- **CNAME** - A Canonical Name record is a type of resource record in the Domain Name System (DNS) that maps one domain name to another. This allows me to use another domain name that I own - [benschem.dev](https://benschem.dev) - instead of the free Github Pages domain name [benschem.github.io/profile](https://benschem.github.io/profile/).
- **.gitignore** - This file tells Git which files and folders to ignore when committing. I've told it to ignore the file `.DS_Store`, which is a macOS file that stores custom attributes of its containing folder, such as folder view options, icon positions, and other visual information. The name is an abbreviation of Desktop Services Store.
- **robots.txt** - A robots.txt file tells search engine crawlers which URLs the crawler can access on your site.
- **sitemap.xml** - An XML sitemap is a file that tells search engines which URLs on your website should be indexed.
- **404.html** - This is a custom error page shown when the requested URL could not be found. 404 is a HTTP status code that indicates that the browser was able to communicate with the server, but the server could not find what was requested.
- **favicon.ico** - This is a small image that is shown in browser tabs and bookmarks.
