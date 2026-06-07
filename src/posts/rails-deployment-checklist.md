---
title: Manual Rails deployment checklist
description: A step-by-step checklist for manually deploying a Rails 7 app with PostgreSQL and SendGrid to a DigitalOcean droplet — no Docker, no Kamal, no Capistrano.
published: 2025-05-20
draft: true
---

This checklist walks through deploying a Rails 7 app with PostgreSQL and SendGrid to a DigitalOcean droplet. It assumes NGINX, firewall, and basic server security (e.g. fail2ban) are already in place. This setup avoids Docker, Capistrano, or Kamal, but notes where they may be useful later.

---

## 1. Prepare the Droplet

- [ ] Create a dedicated Linux user for each app (`myapp`, `myapp-staging`)
- [ ] Install required packages:
  - Ruby (use `rbenv` or `rvm`)
  - Node.js
  - Yarn
  - PostgreSQL
  - Redis (if using background jobs)
  - ImageMagick (for ActiveStorage)
- [ ] Install bundler and Rails CLI
- [ ] Install and configure PostgreSQL:
  - Create separate DBs and DB users for production/staging
  - Restrict external access
- [ ] Confirm UFW allows only necessary ports: 22 (SSH), 80/443 (HTTP/HTTPS)

---

## 2. App Directory Structure

- [ ] Create `/srv/apps/myapp/` with the following structure:
  - `releases/` – each deployment lives here
  - `shared/` – for logs, env files, uploads
  - `current` – symlink to latest release
- [ ] Duplicate structure for staging (`/srv/apps/myapp-staging/`)

---

## 3. Git-Based Deployment Setup

- [ ] Create a bare Git repo on the server: `/srv/git/myapp.git`
- [ ] Set up a `post-receive` hook to:
  - Check out new release to timestamped dir
  - Run `bundle install`, `db:migrate`, `assets:precompile`
  - Link shared folders (e.g. `.env`, `storage`, `log`)
  - Update `current` symlink
  - Restart the app with `systemd`
- [ ] Repeat for staging (`myapp-staging.git`)

---

## 4. Configure the Rails App

- [ ] Add `config/environments/staging.rb`
- [ ] Configure `config/database.yml` for `production` and `staging`
- [ ] Configure `config/storage.yml` (e.g. local for staging, S3 for prod)
- [ ] Add support for `.env`-based environment configuration
- [ ] Ensure `config/credentials/*.yml.enc` is set up for both environments
- [ ] Set proper logging config

---

## 5. Environment Variables

- [ ] Create `.env.production` and `.env.staging` in the `shared/` folder
  - Include `RAILS_ENV`, `DATABASE_URL`, `SECRET_KEY_BASE`, `SENDGRID_API_KEY`, etc.
- [ ] Secure permissions on env files (`chmod 600`)

---

## 6. Configure NGINX

- [ ] Create separate server blocks for:
  - `staging.myapp.com`
  - `myapp.com` / `www.myapp.com`
- [ ] Proxy traffic to the Puma socket (via UNIX socket or TCP)
- [ ] Set up SSL with Let's Encrypt (Certbot)
- [ ] Add Gzip, caching, and security headers

---

## 7. Puma + systemd Setup

- [ ] Create a `puma@myapp.service` unit file for production
- [ ] Create a `puma@myapp-staging.service` unit for staging
- [ ] Set `RAILS_ENV`, working directory, and command to start Puma
- [ ] Enable services and set `Restart=always`

---

## 8. SendGrid Email Setup

- [ ] Configure ActionMailer in `production.rb` and `staging.rb`
- [ ] Use ENV vars for SMTP credentials
- [ ] Verify domain in SendGrid
- [ ] Set up SPF, DKIM, and DMARC records in DNS
- [ ] Test outbound email from both environments

---

## 9. Manual Deployment

- [ ] Add remote Git targets:
  - `git remote add staging ssh://deploy@yourserver:/srv/git/myapp-staging.git`
  - `git remote add production ssh://deploy@yourserver:/srv/git/myapp.git`
- [ ] Deploy via Git push:
  - `git push staging staging`
  - `git push production main`
- [ ] Watch logs (`journalctl -u puma@myapp`) and NGINX logs

---

## 10. Background Workers (Optional)

- [ ] If using Sidekiq:
  - Create `sidekiq@myapp.service` and `sidekiq@myapp-staging.service`
  - Set env and working dir
  - Connect to Redis
- [ ] Enable and monitor services

---

## 11. GitHub Deploy Automation (Optional)

- [ ] Create a GitHub deploy key or token
- [ ] Use GitHub Actions to push to the appropriate remote on branch push
- [ ] Optionally write a local deploy script: `bin/deploy staging`

---

## 12. Backups & Monitoring

- [ ] Set up daily cron job for PostgreSQL dumps
- [ ] Optionally sync backups offsite (e.g. S3)
- [ ] Set up log rotation
- [ ] Use UptimeRobot, Cronitor, or Netdata for monitoring

---

## 13. Production Polish

- [ ] Protect staging with basic auth
- [ ] Clear and reset staging data periodically
- [ ] Secure credentials and env files
- [ ] Document deploy steps in a `DEPLOY.md`
- [ ] Test a clean deploy on a fresh server

---

## Later Automation Options

| Task                        | Manual Now | Common Tools           |
| --------------------------- | ---------- | ---------------------- |
| Git deployment              | ✅         | Capistrano, Kamal      |
| Background worker mgmt      | ✅         | Monit, Foreman, God    |
| DB backups                  | ✅         | pgBackRest, WAL-E      |
| CI/CD deployment            | ❌         | GitHub Actions, Kamal  |
| Infrastructure provisioning | ❌         | Ansible, Terraform     |
| Containerization            | ❌         | Docker, Docker Compose |

---
