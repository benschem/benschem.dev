---
title: Switching from Rosetta to native ARM on an M1 Mac
description: How an early M1 setup quietly ran everything through Rosetta for years, what broke, and the step-by-step migration to native ARM Ruby, Node, and Homebrew.
published: 2026-03-15
draft: true
---

## Background

When I got my M1 MacBook Air (late 2020 / early 2021), I ticked **"Open using Rosetta"** on Terminal.app to get something working — probably Homebrew or Ruby at the time, when ARM support was still patchy. Then I forgot about it.

Everything I installed after that — Homebrew, Ruby (via rbenv), Node (via nvm) — was compiled for x86 and ran through Rosetta translation. It worked, but it was slower than native and caused weird issues down the line, most notably a fork() crash in Puma when running Solid Queue.

## The problem

```
objc[89091]: +[__NSCFConstantString initialize] may have been in progress in
another thread when fork() was called. We cannot safely call it or ignore it
in the fork() child process. Crashing instead.
```

This crash happens when:

1. A Ruby process forks (Solid Queue's Puma plugin does this to run a background supervisor)
2. The Objective-C runtime detects that `+initialize` was in progress during `fork()`
3. macOS kills the child process as a safety measure

## The fix (step by step)

### Step 1: Uncheck Rosetta on Terminal

Quit Terminal completely. In Finder:

**Applications > Utilities > right-click Terminal.app > Get Info > uncheck "Open using Rosetta"**

Reopen Terminal and verify:

```bash
uname -m
# should print: arm64
```

### Step 2: Install ARM Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

This installs to `/opt/homebrew/` (ARM). It won't touch the old x86 install at `/usr/local/`.

Add to `~/.zshrc` (before rbenv/nvm lines):

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify: `which brew` should show `/opt/homebrew/bin/brew`.

### Step 3: Reinstall key Homebrew packages

```bash
brew install rbenv ruby-build git gh bat git-delta starship openssl readline libyaml
```

Don't bother reinstalling everything from x86 Homebrew — just the stuff you actively use.

### Step 4: Reinstall Ruby

```bash
rbenv install 3.3.5   # or whatever versions you use
```

Verify:

```bash
ruby -e "puts RUBY_PLATFORM"
# should print: arm64-darwin24
```

### Step 5: Reinstall Node

```bash
nvm install 25   # or your version
```

Verify:

```bash
file $(which node)
# should show: arm64
```

### Step 6: Rebuild project dependencies

For each **Ruby project**:

```bash
cd <project>
bundle pristine          # rebuilds all native C extensions for arm64
bundle install           # installs anything missing
rm -rf tmp/cache/bootsnap  # clears stale architecture-specific bytecode cache (Rails only)
```

For each **Node project**:

```bash
cd <project>
rm -rf node_modules
npm install
```

### Step 7: Fix the fork() crash for Solid Queue

The `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES` environment variable tells the Objective-C runtime to skip the fork safety check. This is the standard workaround for Rails apps that fork on macOS (Solid Queue, Sidekiq with forking, etc.).

**Important:** This variable must be set at the OS process level _before_ Ruby starts. Setting it in `.env` via `dotenv-rails` is too late — dotenv loads it into Ruby's `ENV` hash after the process has already launched, but the Objective-C runtime reads it at process startup.

If you use **Overmind**, create `.overmind.env` in your project root:

```
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
```

Overmind reads this file and sets the variables before spawning any processes.

If you use **Foreman** or run `rails server` directly, set it in your shell:

```bash
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
```

Or prefix the command:

```bash
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES bin/rails server
```

## Gotchas we hit along the way

### Old x86 Postgres stealing the port

The x86 Homebrew had `postgresql@15` running as a launch agent, binding to `localhost:5432` before the Docker/OrbStack Postgres container could. The error looked like a missing role:

```
FATAL: role "postgres" does not exist
```

But the real issue was Rails was connecting to the _wrong_ Postgres. Fix:

```bash
/usr/local/bin/brew services stop postgresql@15
```

You can check what's listening on 5432 with:

```bash
lsof -i :5432
```

### Stale native gem extensions

After switching architectures, gems with C extensions (puma, nio4r, pg, bootsnap, nokogiri, bcrypt, etc.) have stale x86 `.bundle` files. This causes crashes or "missing extensions" warnings. `bundle pristine` rebuilds them all.

### Stale bootsnap cache

Bootsnap caches compiled Ruby bytecode in `tmp/cache/bootsnap`. This is architecture-specific. Delete it after switching.

### `gem cleanup` can be destructive

Running `gem cleanup` removes old gem versions globally, which can break projects that depend on specific versions. Always run `bundle install` after a cleanup.

## x86 cleanup (optional, low priority)

You can leave `/usr/local/` alone — it's not hurting anything besides disk space. When you're confident everything works on ARM, you can uninstall x86 Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
```

Run it from an ARM shell and it will target the x86 install at `/usr/local/`.
