---
title: Postgres
description: How Postgres actually works under the hood — query planning, indexes, and disk I/O — focused on macOS on Apple Silicon.
published: 2025-08-17
draft: true
---

_macOS on apple silicon_

## How does it work?

Postgresql is a process that runs in the background.
It listens on a TCP or Unix socket.
Translates SQL into disk I/O.

A query goes through several layers:

1. ### SQL Parser

Turns text into internal syntax tree

2. ### Planner/Optimizer

Decides the fastest way to get the data (use an index? scan all rows? join order?)

3. ### Executor

Reads the relevant table/index files using its own storage engine

4. ### Result

Formats the result set and sends it back over the connection

## Where's the data?

Homebrew installs it under `/opt/homebrew/Cellar/postgresql@15/` and symlinks the data directory to `/usr/local/var/postgresql@15/`

One folder per database, each table is stored as one file.
Large tables are split into multiple chunks.
Indexes are stored separately in their own files in a propietary binary format.
Write-Ahead Log (wal) records changes before editing the actual table file for crash safety and replication.

## Installation

brew install postgresql

```zsh
initdb --locale=C -E UTF8 /usr/local/var/postgres
brew services start postgresql
```

## Commands

### Version

```zsh
psql --version
```

### Where is it

```zsh
which psql
```

### Running processes

```zsh
ps -ef | grep postgres
```

Just want the process ids?

```zsh
pgrep postgres
```

### Logs

```zsh
tail /usr/local/var/log/postgresql@15.log
```

### Restart

```
brew services restart postgresql
```

### Stop

```zsh
brew services stop postgresql
```
