---
title: A developer project manager built on the GitHub API
description: Using the GitHub API to pull all your repos and their metadata into a single Sinatra dashboard for tracking personal projects — no database, basic auth, optional OpenAI summaries.
published: 2025-05-21
draft: true
---

I want to use the GitHub API to get all the repos from my account and details about them to use in an app to manage my developer projects

✅ What You Can Do with the GitHub API

1. List Your Repositories

Use the List repositories for the authenticated user endpoint:

GET /user/repos

This returns all repos you have access to—public and private.

You can get metadata such as:

    name, full_name

    description

    created_at, updated_at, pushed_at

    language

    topics

    archived, disabled, fork, etc.

    size, stars, watchers, forks

2. Get Repo Details

Use the Get a repository endpoint:

GET /repos/{owner}/{repo}

3. Read Files from Repos

You can access file contents (e.g., a project.json or status.yml) using the Get repository content endpoint:

GET /repos/{owner}/{repo}/contents/{path}

🔐 Authentication Required

If you're accessing private repos or want higher rate limits, you need to authenticate:

    Use a Personal Access Token (PAT).

    Include it as a header:

    Authorization: token YOUR_TOKEN

⚠️ Caveats and Limitations

    Rate Limits:

        60 requests/hour unauthenticated

        5,000 requests/hour authenticated

        You probably want to cache the data locally and fetch it periodically.

    Pagination:
    The GET /user/repos endpoint is paginated. Default page size is 30; max is 100. You'll need to handle pagination if you have more than 100 repos.

🔧 How to Use This in a Project-Tracking App

Given your goal (managing your dev projects in one place), here's what you can extract:

    Use repo metadata to list all projects with descriptions, dates, and language.

    Optionally define a format like .project-meta.yml in each repo's root to add custom project info (status, tags, goals, etc.).

    Cache GitHub responses locally (e.g. in SQLite or JSON files).

    Trigger updates via webhook or cron job.

👎 What You Can't Do (Directly)

    You can't query across all repos for specific file content (e.g., "find all repos with a status.yml")—you need to iterate through each repo individually.

    You can't get commit messages from all repos in a single API call—you'll have to fetch commits repo-by-repo.

Let me know how you're planning to structure your tracking app and I can suggest how to model the data or what to cache.

---

I just want to build a simple, bog standard dashboard to track every project (git repo) of mine. For each repo I want to track the app name, version, languages, creation date, last updated date, branches, commits, live url if there is one, also I want to display a todo screen for each project using the TODO.md file in the reader if there is one. Not to edit it directly, although if that's possible with the api to edit and commit then maybe as a stretch goal, but this is more meant to be a visual big picture overview of all my stuff and where I'm up to. Basic auth, it's just for me. I'm thinking caching all the data in json and using a client side react app with super simple express backend could be the go? Or Sinatra and SSR even just cos it's even simpler and I like Ruby? What do you suggest? Preferably no database, I'm not going to scale this or add fancy features.

Below is a pragmatic-first rundown of your requirements, the moving parts of the GitHub API, and three architecture options—ranked by "least moving pieces" rather than hype. I challenge a few assumptions along the way so you can pick a path that stays boring-reliable.

1 What the GitHub API gives you (out of the box)

| Data you need                                                                                 | API endpoint(s)                                                                                                                                     | Notes / pitfalls                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Repositories & metadata (name, default branch, created / updated dates, languages, clone URL) | `GET /user/repos` (paginated)                                                                                                                       | 1 request per 100 repos page.                                      |
| Languages breakdown                                                                           | `GET /repos/{owner}/{repo}/languages`                                                                                                               | Returns byte count by language; useful for a pie chart.            |
| Branches                                                                                      | `GET /repos/{owner}/{repo}/branches`                                                                                                                | Each branch call is separate; cache aggressively.                  |
| Commits count / latest commit                                                                 | `GET /repos/{owner}/{repo}/commits?per_page=1` — `per_page=1` just to get the header Link and last page number (faster than fetching every commit). |
| README / TODO.md                                                                              | `GET /repos/{owner}/{repo}/contents/TODO.md` (or README)                                                                                            | Returns base-64; decode client-side.                               |
| Editing / committing (stretch)                                                                | Create/Update a file: `PUT /repos/{owner}/{repo}/contents/{path}`                                                                                   | Needs commit message + SHA, but easy once you have the TODO's sha. |

All of the above stay within the 5 000 requests/h PAT-authenticated ceiling. With caching you'll be nowhere near it.

2 Why you probably don't need a database

    Reads dominate; writes are rare (only if you ship the stretch goal).

    API responses are already JSON; serialise them straight to disk (data/…/*.json).

    One atomic "refresh" job that rewrites the cache is simpler than trying to diff-update rows in SQLite.

Think of the cache as a single-source snapshot. When you press "Refresh", you nuke & repopulate it. Worst-case you're holding a few MB on disk.

3 Architecture options (from simplest upward)

Option A Static-files + client-side React (JS-only, no server)

    Build-time script (Node or Ruby) hits the GitHub API, dumps repos.json and one todo-<repo>.md per repo into /public/data.

    Static hosting (Netlify, GitHub Pages, S3) serves an SPA written in React or even plain HTMX/Alpine.

    "Refresh" is a CLI you run locally or a GitHub Action that commits new JSON back to the site repo.

Pros

    Zero running server—cheap, no patching.

    Can deploy on GitHub Pages for free.

Cons

    "Refresh" requires a commit → redeploy. Slight lag vs. clicking a button.

    Client must fetch potentially large JSON file (but gzip-friendly).

Option B Tiny Sinatra (or Express) API + mostly static front-end ← my recommended sweet-spot

    Backend (Sinatra/Express)

        Single route /api/repos returns the cached JSON.

        Task /refresh (POST or cron) repopulates cache folder; returns 202.

    Frontend

        Plain React (or even Hotwire/Turbo) fetches /api/repos; renders dashboard.

        You still host the static assets via the same server or a CDN.

Why this hits the Goldilocks zone

    You get a "Refresh" button with no redeploy.

    Code stays tiny—one Ruby file, one ERB/JSX template.

    Friendly to future stretch (editing TODO.md → commit) because you already have a server to hold the PAT secretly.

Option C Full server-side render (Sinatra + ERB/Haml)

    Sinatra fetches JSON cache, renders HTML; no React.

    Hot-reload the page and you're done.

Pros

    Even less JS.

    Faster first paint.

Cons

    Interactive niceties (filters, search) become sprinkle-of-JS territory again.

    If you later want a richer UI you'll re-introduce a JS bundle.

4 Implementation sketch for Option B

```
repo-dashboard/
├─ cache/
│ └─ repos.json
├─ app.rb # Sinatra
├─ scripts/
│ └─ refresh.rb # Ruby script that populates /cache
└─ public/
└─ index.html # React bundle
```

scripts/refresh.rb (run manually or via cron/GitHub Action)

```ruby
require 'octokit'
require 'json'

client = Octokit::Client.new(access_token: ENV['GH_PAT'])
repos = client.auto_paginate = true && client.repos

File.write('cache/repos.json', JSON.pretty_generate(repos.map do |r|
  {
    name: r.name,
    html_url: r.html_url,
    created_at: r.created_at,
    updated_at: r.updated_at,
    default_branch: r.default_branch,
    languages: client.languages(r.full_name),
    branches: client.branches(r.full_name).map(&:name),
    commits: client.commits(r.full_name, per_page: 1).last_response.rels&.to_i || 1,
    todo_md: begin
      Base64.decode64(client.contents(r.full_name, path: 'TODO.md').content)
    rescue Octokit::NotFound
      nil
    end
  }
end))
```

app.rb

```ruby
require 'sinatra'
require 'json'

get '/api/repos' do
  cache = File.read('cache/repos.json')
  content_type :json
  cache
end

post '/refresh' do
  system('ruby scripts/refresh.rb &') # async refresh
  status 202
end
```

Zero database, two Ruby files, one JSON cache.

5 Stretch goal: commit updated TODO.md

    Front-end sends new Markdown string + repo name to /update_todo.

    Sinatra does:

        sha = client.contents(repo, path: 'TODO.md').sha

        client.update_contents(repo, 'TODO.md', 'Update TODO from dashboard', sha, new_content)

No extra complexity.

6 Bias check & counter-arguments

    "I don't like servers, static is safer."
    Then option A is valid—just know you'll automate the refresh via CI and live with a few-minutes delay.

    "Why not SQLite?"
    If you hit the API often (e.g., show per-branch commit graphs) SQLite gives query flexibility. But your stated scope is snapshot counts—JSON suffices.

    "What about GraphQL?"
    The REST calls above are simpler and require fewer mental cycles. GraphQL would let you fetch languages + branches in one round trip, but you'll still parse pagination and it's overkill for a solo dashboard.

TL;DR

    Start with Option B (Sinatra API + React static front-end, JSON cache on disk).

    Keep scripts/refresh.rb idempotent and fast.

    Add the edit-TODO feature only if it stops being a vanity metric and becomes a workflow.

Stay boring, ship fast, and go write code—not infra.

---

For the React app in option B, do I need a whole vite install or can I just use a cdn

You don't need Vite or any bundler if you're happy with minimal React + JSX and don't need advanced tooling (e.g. TypeScript, JSX transforms, hot reload, code splitting).

✅ Yes, you can use React via a CDN — here's how:

1. Use React + ReactDOM from CDN

Include these in your public/index.html:

```html
<script
  src="https://unpkg.com/react@18/umd/react.development.js"
  crossorigin
></script>
<script
  src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
  crossorigin
></script>
```

For production, just swap development → production.

2. Write JSX-free or precompiled JS

CDN-based React can't interpret JSX in the browser directly. So you have two options:

Option A: Write without JSX

```html
<script>
  const App = () => React.createElement("div", null, "Hello from React!");

  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(App),
  );
</script>
```

Painful, but zero build step.

Option B: Use JSX + compile it once with Babel

If you want JSX but still no Vite/Webpack, use Babel Standalone in the browser:

```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
```

Then mark your JSX scripts with type="text/babel":

```html
<div id="root"></div>

<script type="text/babel">
  const App = () => <div>Hello from React + JSX!</div>;

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
</script>
```

This works well enough for small projects. Downsides:

    Babel in the browser adds ~300KB.

    No linting, no pre-submit validation, and slower page loads.

    You're not writing idiomatic React (no import/export, no modules).

Middle-ground: Use Vite only to build, not to serve

If you later want:

    .jsx files

    ES modules

    cleaner dev experience

You can still keep your Sinatra backend but run:

```
npm create vite@latest
```

Then vite build, and just copy the output to /public.

This gives you the comfort of React development tooling without turning your app into a full JS stack. Sinatra still serves your pages and APIs.

Bottom line

    If you want zero tooling: use CDN + plain JS or Babel in-browser.

    If you want JSX and modules but no JS server: use Vite for build only.

    If you're doing more than 1–2 pages: you'll quickly outgrow the CDN approach.

---

I think let's keep this as simple as possible and just skip react and use an ERB index and show page. Although I guess search and filter might be useful…

Good call. If your priority is simplicity and you're already leaning Ruby, then a server-rendered Sinatra app with ERB templates is a solid move—and you can absolutely add just enough interactivity without pulling in React.

Here's a breakdown of how to keep it simple while still supporting search/filter later if needed.

✅ Minimal Sinatra Architecture (No React)

```
repo-dashboard/
├── app.rb # Sinatra routes + rendering
├── cache/
│ └── repos.json # GitHub API snapshot
├── views/
│ ├── layout.erb # HTML scaffold
│ ├── index.erb # Dashboard page
│ └── show.erb # Per-repo TODO page
├── public/
│ └── (optional CSS/JS)
└── scripts/
└── refresh.rb # Rebuild cache via GitHub API
```

💡 Add Search/Filter Without React

You don't need React for client-side filtering. Two options:

Option 1: Server-side filtering

Add a query param and filter in Sinatra:

```ruby
get '/' do
  query = params['q']
  @repos = load_repos
  @repos.select! { |r| r[:name].include?(query) } if query
  erb :index
end
```

And in your view:

```html
<form method="get">
  <input name="q" value="<%= params['q'] %>" placeholder="Search repos..." />
  <button type="submit">Search</button>
</form>
```

Pros: Simple, works with back/forward buttons, shareable URLs.
Cons: Hits the server every time you search.

Option 2: Client-side filtering with vanilla JS

Still render the full list in ERB, but add a <script> to dynamically filter based on input.

```html
<input id="filter" placeholder="Filter by name…" />

<ul id="repo-list">
  <% @repos.each do |repo| %>
  <li data-name="<%= repo[:name].downcase %>"><%= repo[:name] %></li>
  <% end %>
</ul>

<script>
  const input = document.getElementById("filter");
  const list = document.getElementById("repo-list").children;

  input.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    for (let li of list) {
      li.style.display = li.dataset.name.includes(query) ? "" : "none";
    }
  });
</script>
```

Pros: Feels instant.
Cons: Filters only the data already loaded; no pagination.

🔍 What This Supports Cleanly

    Dashboard view with repo metadata

    Per-repo "show" page for TODO.md (or README fallback)

    Server-side refresh endpoint to update repos.json

    Optional client-side sugar for filtering

    No database, no build step, no frontend framework

TL;DR

Stick with Sinatra + ERB unless you need component-driven state (which you don't right now). If search/filter becomes more complex later, consider enhancing with Alpine.js or Stimulus—still much lighter than React.

---

If I pulled in stimulus and turbo what would that involve and how much overhead would it add?

Pulling in Stimulus and Turbo adds very little overhead and is a good middle path—especially for a Sinatra + ERB setup. You get richer interactivity and navigation without writing a full frontend framework or API layer.

📦 What You're Pulling In

| Library  | Size (min+gz) | What it does                                   |
| -------- | ------------- | ---------------------------------------------- |
| Turbo    | ~30 KB        | Intercepts links/forms for fast nav (SPA feel) |
| Stimulus | ~10 KB        | JS controller system for light interactivity   |

Total: ~40 KB JS with no build step required.

📄 What You Have to Do

1. Include Turbo + Stimulus via CDN

Add this in views/layout.erb:

```html
<head>
  <script type="module">
    import { Application } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js";
    import * as Turbo from "https://unpkg.com/@hotwired/turbo@7.3.0/dist/turbo.es2017-esm.js";

    window.Stimulus = Application.start();
  </script>
</head>
```

No bundler, no npm install, no asset pipeline—just ESM imports via unpkg.

2. Add Turbo-driven navigation (optional)

Turbo automatically makes <a href> clicks and form submissions work like an SPA: fast reloads with no full-page refresh.

For example, your dashboard index:

```html
<a href="/repo/<%= repo[:name] %>" data-turbo-frame="main">View details</a>
```

Or wrap the page in:

```html
<turbo-frame id="main">
  <!-- page content -->
</turbo-frame>
```

Turbo intercepts navigation and only updates the frame—not the whole page.

3. Use Stimulus for behavior (like search)

Write your own controller:

```html
<script type="module">
  Stimulus.register(
    "filter",
    class extends Stimulus.Controller {
      static targets = ["input", "item"];

      filter() {
        const query = this.inputTarget.value.toLowerCase();
        this.itemTargets.forEach((el) => {
          el.hidden = !el.dataset.name.includes(query);
        });
      }
    },
  );
</script>
```

Then in views/index.erb:

```html
<div data-controller="filter">
  <input data-filter-target="input" data-action="input->filter#filter" />
  <ul>
    <% @repos.each do |repo| %>
    <li data-filter-target="item" data-name="<%= repo[:name].downcase %>">
      <%= repo[:name] %>
    </li>
    <% end %>
  </ul>
</div>
```

That's it. Now you have interactive filtering with no React, no bundler, and a clean, declarative setup.

📉 Overhead Summary

| What           | Cost                                                 |
| -------------- | ---------------------------------------------------- |
| JS size        | ~40 KB total (CDN, no build)                         |
| Learning curve | Low if you're already familiar with HTML and some JS |
| Setup          | 2 CDN scripts + 1 tiny controller file               |
| Maintenance    | Minimal; no custom tooling or dependency sprawl      |

🧠 When to Use This

    You want the UX of an SPA but the simplicity of server-rendered HTML.

    You want JS sprinkles for interaction (e.g. filtering, expanding sections) but don't want to write a whole SPA.

    You're building pages, not components.

TL;DR

    ✅ Turbo gives you instant-feeling navigation and form submission with no extra setup.

    ✅ Stimulus gives you a dead-simple way to add interaction like filtering, toggling, keyboard shortcuts, etc.

    ✅ No build tools required if you're OK writing ES modules directly or inlining simple controllers.

    🧠 Worth it if you might otherwise reach for React just for interactivity.

---

If i want to add screenshots of each app, is there an automated way to do that besides manually adding them in each repo and fetching the files with the api? Or is this over complicating it.

Automatically adding screenshots of each app is definitely possible, but it does introduce a layer of complexity that may not be worth it depending on your goals.

Here are the main approaches and their trade-offs:

1. Manual screenshots stored in each repo (simple, reliable)

   You add an image file (screenshot.png or similar) in each repo yourself.

   Your app fetches it via GitHub API (raw file URL) and displays it.

   Pros: Simple, predictable, controlled quality.

   Cons: Manual overhead on your part to keep images updated.

2. Automated screenshots using web page screenshot tools (complex, flexible)

   Use a headless browser like Puppeteer or Playwright to open your live app URLs and take screenshots automatically.

   Store those images somewhere accessible (your server, CDN, S3, etc).

   Your dashboard fetches those pre-generated images for display.

   Pros: Fully automated, captures the actual live app UI.

   Cons: Requires hosting live apps or staging sites, setup/maintenance overhead, storage/serving infrastructure.

   Also needs a scheduled job or manual trigger to regenerate images when apps update.

3. Third-party screenshot services (somewhat easier, paid)

   Use API services like ScreenshotAPI, PagePeeker, or Urlbox that provide programmatic screenshotting of URLs.

   Fetch images on demand or cache them.

   Pros: No need to manage your own screenshot infrastructure.

   Cons: Usually paid, external dependency, limits or costs scale with usage.

4. Overcomplication risk

Since your main goal is a simple dashboard without fancy scaling, adding automatic screenshot generation probably overcomplicates your stack:

    You'd need live URLs for your apps (which might not exist if some repos are libraries or private projects).

    You'll need to decide where to store and serve the images.

    Image updates can lag or break if apps go down or change structure.

My recommendation:

    Start simple: manually add screenshots in repos if you want them displayed, or keep a local folder of images linked by repo name.

    Only automate later if this becomes a bottleneck or your number of projects grows significantly.

    If you want to experiment, Puppeteer scripts for local snapshot generation can be a fun stretch goal but don't build your entire system around it.

If you want, I can help sketch a minimal Puppeteer script or example API call to a third-party service for automated screenshots. Otherwise, you can keep this feature manual to stay focused on your core dashboard.

---

What does the language endpoint return?

The GitHub API's Languages endpoint returns a JSON object listing the programming languages used in a specific repository, along with the number of bytes of code written in each language.

Endpoint

```
GET /repos/{owner}/{repo}/languages
```

Example Request

```
GET https://api.github.com/repos/octocat/Hello-World/languages
```

Response format

```json
{
  "JavaScript": 15000,
  "HTML": 5000,
  "CSS": 2000
}
```

    Keys: Language names as strings.

    Values: Number of bytes of code written in that language.

What it tells you

    Which languages are present in the repo.

    Rough proportion of code by language (based on bytes).

What it doesn't tell you

    Language versions (e.g., Python 3 vs 2).

    Detailed breakdown like frameworks or libraries used.

    Anything about commit history or branches.

How it fits your app

You can fetch this endpoint per repo and then display the language list and a rough share, for example as badges or a simple table.

If you want an overall "primary language," just pick the language with the highest byte count.

---

What approaches could I take to determine the tools and frameworks used in each project? Or is it overkill again?

Determining tools and frameworks used in each project is possible but significantly more complex than detecting languages via the GitHub API. Whether it's worth the effort depends on your priorities.

Here are some approaches, with pros and cons:

1. Heuristic file detection (simplest, manual rules)

Scan the repo contents (via GitHub API or a local clone) for specific config or lock files that reveal tools/frameworks, e.g.:

    `package.json` — Node.js (and possibly React, Vue, etc., if you parse dependencies)

    `Gemfile` — Ruby / Rails

    `requirements.txt` or `Pipfile` — Python

    `composer.json` — PHP

    `webpack.config.js` — Webpack

    `next.config.js` — Next.js

    `angular.json` — Angular

    `pom.xml` — Java / Maven

You can also parse dependency lists for known framework names.

Pros: Relatively simple to implement, leverages existing data.
Cons: Requires writing and maintaining heuristic rules; can't guarantee accuracy or completeness.

2. GitHub Topics and README parsing (indirect signals)

   Use GitHub repo metadata like topics/tags (e.g., react, rails) that repo owners add voluntarily.

   Parse README.md for keywords like "Built with React" or badges.

Pros: Easy to get via API, no heavy parsing.
Cons: Unreliable, depends on how carefully you maintain metadata and README content.

3. Static analysis / Dependency graph (complex)

   Clone repos locally and analyze the dependency trees (e.g., `npm ls`, `bundle list`) to detect frameworks and tools.

   Use static analysis tools or language-specific linters.

Pros: Most accurate and detailed.
Cons: Requires cloning repos, running language-specific tools, heavier infrastructure.

4. Use existing tools or APIs

   Services like Libraries.io analyze dependencies across repositories and expose data about package usage.

   GitHub's own Dependency Graph API can provide some data if enabled.

Pros: Leverages existing analysis.
Cons: May require paid access or complex API usage.

Is this overkill?

For a personal dashboard mainly tracking project status and basic metadata, it's probably overkill:

    Parsing languages (from GitHub API) plus manual notes in your TODO.md or a metadata file per repo could be simpler and more reliable.

    Frameworks and tools can change frequently or be polyglot, making automatic detection brittle.

    The effort-to-benefit ratio for automatic tool detection is low unless you really want detailed insights.

Practical middle ground

    Use language stats as a proxy. For example, if `package.json` exists, assume Node.js and potentially JS frameworks.

    Add a small manual metadata file (`meta.json`) or a section in TODO.md to record frameworks/tools as you see fit.

    Use GitHub topics for quick signals but don't rely solely on them.

---

I am going to deploy this to my digital ocean droplet, should I setup about logging or anything else?

Yes, even for a personal dashboard app deployed on your DigitalOcean droplet, setting up proper logging and some basic operational practices will save you time troubleshooting and keep your app maintainable.

Here's what you should consider:

1. Logging

   Access logs: Log all HTTP requests (method, path, status, IP, user-agent). Useful for monitoring traffic and spotting unusual activity.

   Error logs: Capture exceptions, stack traces, and errors. This is critical to identify bugs or runtime issues.

   Request-specific logs: For debugging, consider logging incoming parameters or GitHub API responses (sanitize sensitive data).

How to implement:

    For Sinatra or Express, use middleware like Rack::Logger (Ruby) or morgan (Node).

    Configure log rotation to avoid huge files (logrotate on Linux).

    Write logs to files under `/var/log/yourapp` or standard output if using a process manager (see below).

2. Process management

Use a process manager like systemd, PM2 (Node), or foreman to:

    Keep your app running and restart on failure.

    Manage logs (stdout/stderr).

    Enable automatic startup on server reboot.

3. Environment configuration

   Use environment variables to store your GitHub token, secrets, and config values.

   Don't hardcode sensitive info or commit it to your repo.

4. Security

   Use HTTPS (via Let's Encrypt and NGINX as a reverse proxy).

   Protect your dashboard with basic auth or another simple auth method since it's private.

   Limit API rate usage: cache GitHub responses aggressively to avoid hitting rate limits and reduce latency.

5. Monitoring & Alerts (optional but useful)

   Basic uptime checks (like UptimeRobot) to notify you if the site goes down.

   Disk space and CPU monitoring on the droplet (using tools like htop or DigitalOcean monitoring).

   Logs inspection occasionally to catch errors early.

6. Backups (if applicable)

   If you store any data (cache files, screenshots), consider periodic backups.

   For a no-database setup, this may be just backing up your app directory.

---

Is there a rack basic auth I can use? Any other rack middleware I might want?

Yes, Rack includes a very straightforward middleware for HTTP Basic Authentication called Rack::Auth::Basic that works perfectly with Sinatra or any Rack-based app.

How to use Rack::Auth::Basic

```ruby
use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == ENV["DASHBOARD_USER"] && password == ENV["DASHBOARD_PASS"]
end
```

    The block verifies credentials; here, it compares against environment variables (strongly recommended for security).

    "Restricted Area" is the message shown in the login popup.

Other Rack middleware you might want

    Rack::Logger — Logs basic request info to your app's logger. Useful for development and production logs.

    Rack::Deflater — Compresses responses with gzip/deflate. Speeds up client load times and reduces bandwidth.

    Rack::Static — Serves static assets (CSS, JS, images) efficiently if you're not using a separate web server for static files.

    Rack::Session::Cookie — If you need sessions for any reason (e.g., flash messages or user state), this is the simplest way.

    Rack::Protection (if using Sinatra) — Provides basic security protections against typical web attacks (CSRF, XSS, clickjacking).

    Rack::Timeout — Abort requests that take too long, protecting your app from hanging requests.

Example minimal Sinatra setup with Rack middlewares:

```ruby
require 'sinatra'

use Rack::Auth::Basic, "Restricted Area" do |u, p|
  u == ENV['DASHBOARD_USER'] && p == ENV['DASHBOARD_PASS']
end

use Rack::Deflater
use Rack::Logger

get '/' do
  logger.info "Serving dashboard"
  erb :index
end
```

---

I just want an appropriate colour to go with each language, like red for Ruby, yellow for JavaScript etc without having to manually list them all

You're describing the kind of language-color mapping GitHub itself uses for syntax highlighting and language stats — they have a standardized set of colors associated with most popular programming languages.

The best way to get this without manually listing every language and color is to use the GitHub Linguist language-color JSON file, which is open source and maintained by GitHub.

The JSON lives inside the Linguist repo:
https://github.com/github/linguist/blob/master/lib/linguist/languages.yml

This file is YAML, but you can convert it to JSON easily.

Quick example of the data snippet:

```yaml
Ruby:
  type: programming
  color: "#701516"
JavaScript:
  type: programming
  color: "#f1e05a"
Python:
  type: programming
  color: "#3572A5"
```

---

I already have an OpenAI api key, am I doing too much if I sent each repos file structure and read me over to get a summary?

You're not necessarily doing too much — it depends on your goals and how far you want to take this. Sending each repo's file structure + README + (possibly) other files like Gemfile, package.json, requirements.txt to OpenAI to get a summary of the project — "what is this app, what tech is used, what does it do?" — can work and be insightful, but here's a breakdown of the pros and cons:

✅ Benefits

    Gives you an auto-generated, human-readable summary.

    Helps surface old forgotten projects or incomplete ones.

    You get a "big picture" overview with minimal manual tagging or notes.

⚠️ Costs & Overhead

1. Token Usage

   A full README + file structure + extra files can easily hit several thousand tokens per repo.

   Multiply that by dozens of repos and it gets expensive fast.

   Mitigate by truncating large files, skipping binary or vendor folders, doing one-time runs and caching the output.

2. Latency

   GPT calls aren't instant. Doing this dynamically on every page load is a terrible idea.

   You'll need to cache summaries in a local JSON file or similar store.

3. Rate Limits & Stability

   You don't want to hit the API every time something changes.

   Only reprocess on new commits or README updates. Possibly batch process periodically.

🧠 Smarter Approach: Hybrid Method

Use automation where it adds the most value, but don't blindly send everything.

🔹 What to send to OpenAI

    README (first ~2,000 tokens only)

    File tree (no file contents)

    Selected key files: Gemfile, package.json, requirements.txt, Cargo.toml, etc.

You could even prompt like:

> "Summarize what this project does based on the README and file structure. List key frameworks, programming languages, and any notable tools."

This is cheaper and faster, but still useful.

🔹 When to send it

    Only once per repo unless README or tech files change (cache the summary).

    Store summaries in a flat JSON like:

```json
{
  "my-repo": {
    "summary": "...",
    "last_updated": "2025-05-20T10:15:00Z"
  }
}
```

🔄 Alternative: Markdown Summaries in Repos

If you don't want to use OpenAI: add a `_summary.md` or `ABOUT.md` file to each repo with a high-level overview. Then just read those with the GitHub API. It's more manual, but dead simple and future-proof.

✅ Verdict

No, you're not doing too much if: you cache results, limit what you send, batch it offline (not dynamically in the app). If you skip those precautions, it becomes wasteful and brittle.

---

## Build & deployment roadmap

# 🛠️ Personal Project Dashboard - Build & Deployment Roadmap

A lightweight Sinatra-based app to track your GitHub repos and personal dev projects using ERB views, cached JSON, and no database. Designed for simplicity, maintainability, and deployability.

---

## ✅ Core Goals

- Track all personal GitHub repos
- Cache metadata (languages, README, branches, TODO.md, etc.) in local JSON
- Display summary in clean UI (index + show)
- Secure with basic auth
- Deploy to DigitalOcean droplet (manual setup)

---

## 📁 File Structure

```
project_dashboard/
├── app.rb
├── views/
│   ├── index.erb
│   └── show.erb
├── public/
│   └── styles.css
├── data/
│   └── repos.json
├── config.ru
├── Gemfile
├── .env (optional)
└── scripts/
    └── fetch_repos.rb
```

---

## 🧱 Phase 1: Setup & Core App

### 1. Initialize project

- `bundle init`
- Add to `Gemfile`:

```ruby
gem 'sinatra'
gem 'json'
gem 'httparty'
gem 'rack'
gem 'dotenv' # optional
```

```
bundle install
```

### 2. Create Sinatra app (app.rb)

Mount from config.ru. Use classic style or modular if preferred.

### 3. Implement Basic Auth middleware

```ruby
use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == ENV['DASH_USERNAME'] && password == ENV['DASH_PASSWORD']
end
```

Store credentials in .env.

### 4. Write JSON caching script (scripts/fetch_repos.rb)

Uses GitHub API. Pulls: repo name, full name, description, creation date, last updated, languages (/languages), default branch, README, TODO.md if present, home page URL. Caches to `data/repos.json`. Run manually or via cron/script for updates.

## 💻 Phase 2: Views and UI

1. Basic index view (views/index.erb): loop through JSON. Show name, language badges, last updated, link to show page.
2. Show page (views/show.erb): render README (Markdown → HTML), TODO.md (if available), project metadata.
3. Add styling (optional): basic CSS or drop in something like Pico.css or Skeleton.

## 🔒 Phase 3: Deployment

1. Setup DigitalOcean droplet: Ubuntu LTS (22.04). Install Ruby + Bundler, Git, NGINX, systemd.
2. Set up reverse proxy: NGINX forwards to localhost:9292. Use systemd service to run `bundle exec rackup`.
3. Configure ENV vars: set DASH_USERNAME and DASH_PASSWORD in systemd or .env.

## 🧪 Phase 4: Polishing

1. Add error handling — if API rate limit hit or invalid response, log and skip. Ensure missing data doesn't break UI.
2. Add logging — use Logger class or just puts + timestamps. Log to file if needed.
3. Optionally add screenshots — manually add to /public/screenshots/{repo}.png. Link or embed based on repo name.

## 🚀 Stretch Goals

🔹 Hotwire/Stimulus Integration

    Add turbo-rails + stimulus.js via CDN

    Replace form submits or page links with Turbo frames

    Use Stimulus controllers for interactivity (e.g. collapsible TODOs, live search)

🔹 OpenAI Integration

    Script sends README, file structure, key files to OpenAI

    Caches summary field in repos.json

    Display in show view

Prompt example:

> Summarize what this repo does based on its README and structure. List languages, frameworks, and purpose.

Consider: token limits, costs, cache invalidation.

## 📌 Final Tips

    No database = fast, portable, fewer headaches

    Cache aggressively: the GitHub API has rate limits

    Focus on clarity: the goal is a mental map of your dev world

    Keep scripts modular so you can tweak easily

## ✅ Deployment Checklist

- [ ] `bundle install` on server
- [ ] `config.ru` configured
- [ ] `.env` with basic auth
- [ ] systemd service to run rackup
- [ ] NGINX reverse proxy
- [ ] Cronjob or manual script run for repo data updates
- [ ] Ensure `data/repos.json` is world-readable
- [ ] Logging + error output visible somewhere

## 📁 Future Ideas

    Tag repos by status (WIP, Complete, Archive)

    Show git commit graph with `git log --graph`

    Track last personal commit (vs contributions)

    Build a CLI to open projects locally
