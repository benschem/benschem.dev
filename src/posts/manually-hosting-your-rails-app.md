---
title: Manually hosting your Rails app
description: Manually deploying a Rails 8 app to a virtual machine, with PostgreSQL, SolidQueue, local storage, SendGrid, and Heroku-style git push deploys — no PaaS, no Kamal.
published: 2025-05-20
updated: 2025-12-31
draft: true
---

Who wants to manually deploy a Ruby on Rails app in 2025? These days there are many other ways to deploy - most are arguably better - but we're going to walk through manually deploying a Rails 8 app to a virtual machine.

In this example I'm working with I've made some decisions:

- Rails 8
- A PostgreSQL database
- SolidQueue for background jobs (no Sidekiq and no Redis)
- Local storage for user uploaded files (no Cloudinary or S3)

While we're at it, we're also going to

- Enable your app to send emails using SendGrid
- Let you deploy from a git push command (Heroku style)
- Setup a staging environment

We're doing this for the learning experience, so we're not going to use a PaaS (Platform as a Service) like Heroku, or any automation tools like Kamal or Capistrano.

## Setup a server

1. Manually provision a linux virtual machine with SSH access (I suggest using the cheapest Digital Ocean droplet, as these can run multiple low-traffic apps for only $5USD per month.)

2. Install NGINX

3. Set up basic server security
   - firewalld
   - fail2ban

Setting up a VM properly could be a separate article of it's own, so if you haven't already done it then you might want to read about that and come back to deploying your Rails app later.

## Prepare your server

The commands are different depending on which flavour of Linux you're running. Check the documentation for your chosen distro.

1. It's good practise to create a new Linux user for each app to isolate permissions.
   - Create 2 separate users:
     - myapp
     - myapp-staging
   - Add both to the appropriate user group

2. Install app dependencies:
   - Ruby (use rbenv or rvm)
   - Bundler
   - Node.js (if needed)
   - Yarn (if needed)
   - PostgreSQL
   - ImageMagick

3. Install, rails CLI, and any other necessary Ruby global tools

4. Install and configure PostgreSQL, create separate DBs and DB users for staging and production

5. Secure your PostgreSQL server (local socket connections only, or secure password auth)

Configure the firewall (ufw) to only allow necessary ports: 22, 80, 443

## Server app folder structure

In the home directory of your app user, make this folder structure:

```
~/srv/apps/myapp/current # symlink to current release
~/srv/apps/myapp/releases/ # each deploy goes in a serialised folder in here
~/srv/apps/myapp/shared/ # env files, uploads, logs, etc
```

Create the same structure for staging (/srv/apps/myapp-staging)

### User-uploaded files

For simplicity and cost saving, and since we're deplying to a server we have direct control over, we're just going to store user uploaded files locally. If the app usage scales enough, we may have to consider moving these.

check `config/storage.yml` to make sure you have something like this setup:

```
test:
service: Disk
root: <%= Rails.root.join("tmp/storage") %>

local:
service: Disk
root: <%= Rails.root.join("storage") %>
```

Create the `storage/` folder within your app directory.

Ensure the `storage/` folder persists across deploys (or symlink it from somewhere else).

Ensure permissions are correct (`chmod -R 755 storage/`).

## Configure your Rails app

1. Add a config/environments/staging.rb file based on production.rb

Staging should be nearly identical to production, but here are a few common differences to consider:

- config.log_level = :debug
- config.action_mailer.delivery_method = :letter_opener (a gem to avoid sending real emails).
- consider https://github.com/fgrehm/letter_opener_web
- config.cache_classes = false and config.eager_load = false — if you want faster reloads (optional).
- Use separate credentials (config.require_master_key = true) and ENV variables for API keys, etc.
- Consider disabling real payment gateways or external services (use sandbox/test modes).

2. Add production and staging entries to config/database.yml
3. Setup config/storage.yml if using Active Storage (e.g. local in staging, S3 in production)
4. Add support for RAILS_ENV=staging and production via .env files
5. Add logging setup (to file, stdout, or both)
6. Ensure config/credentials.yml.enc is set up and accessible (EDITOR=vim rails credentials:edit --environment staging)

## Environment Variables

1. Create .env.staging and .env.production in /srv/apps/myapp/shared/
2. Include RAILS_ENV, DATABASE_URL, SECRET_KEY_BASE, SENDGRID_API_KEY, etc.
3. Lock down permissions (chmod 600) and ensure they're loaded by systemd

## NGINX

1. Create NGINX server blocks for:
   - staging.myapp.com that points to app user's Puma socket for staging
   - www.myapp.com and/or myapp.com that points to production socket
2. Configure SSL using Let's Encrypt (e.g. with Certbot)
3. Set up Gzip, cache headers, and basic rate limiting
4. Point your DNS records to the droplet

## Puma with systemd

Create puma.service unit files for staging and production that:

- Runs app as appropriate app user
- Starts app in RAILS_ENV=production or staging
- Uses bundle exec puma -C config/puma.rb
- Includes Restart=always, logging to journal
- Enable and start the systemd units

## SendGrid email

- Add SendGrid via action_mailer config in both production.rb and staging.rb
- Use ENV["SENDGRID_USERNAME"] and ENV["SENDGRID_API_KEY"]
- Confirm domain in SendGrid dashboard
- Add SPF, DKIM, and DMARC DNS records for your domain to pass email auth

Test email sending from both environments

# Git push to deploy

On the server, create a bare Git repo (e.g. /srv/git/myapp.git)

Create a post-receive hook that:

1. Checks out code to a new timestamped release directory
2. Runs bundle install, db:migrate, assets:precompile
3. Symlinks shared .env, storage, log, etc.
4. Updates the current symlink
5. Restarts the app via systemd

Duplicate this for staging with appropriate branch/env changes

## Deploy the app

On your local dev machine, add the server as a Git remote:

```zsh
git remote add staging ssh://deploy@yourserver:/srv/git/myapp-staging.git
git remote add production ssh://deploy@yourserver:/srv/git/myapp.git
```

Push to deploy:

```zsh
git push staging staging
git push production main
```

Watch logs (journalctl -u puma@myapp or NGINX logs) for issues.

## Using Sidekiq instead of SolidQueue

1. Install Redis on the server
2. Create sidekiq@myapp.service and sidekiq@myapp-staging.service systemd units
3. Point to the same shared .env and Redis
4. Enable autostart and logging via journal

## Set Up Monitoring & Backups

- Configure daily cron jobs for:
  - PostgreSQL dumps to /srv/backups/myapp/db
  - /storage dumps to /srv/backups/myapp/storage
  - Backup rotation
  - Log rotation
- Optionally (but you really should) auto sync backups to external storage (like S3 or even your personal machine)
- Set up uptime monitoring (UptimeRobot)
- Consider Netdata, Prometheus, or a lightweight metric dashboard

## Lastly

- Clean up staging data regularly (cron job Rake Task?)
- Hide staging behind basic auth (Rack auth?)
- Lock production secrets & monitor environment file access
