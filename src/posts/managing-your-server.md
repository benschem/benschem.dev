---
title: Managing your server
description: Notes on managing a Linux server day-to-day — logging in, checking system info, updates, and the commands you reach for when something feels off.
published: 2025-05-20
draft: true
---

Check why I have a nobody user - probably from book Deployment from scratch

## Logging in

I have an alias set up, have to check how and what I did here, but to SSH in just:

```bash
ssh droplet-root
su - user
```

## System Information

```bash
uptime
uname -r # kernel version
hostnamectl # system hostname and OS info
uptime # how long the system has been running
top # or htop # real-time system resource usage
free -h # memory usage
df -h # disk usage
lsblk # list block devices (e.g. drives and partitions)
```

## Networking

```bash
ip a # show internal IP addresses
ping <host> # test network
nmcli device status # list network devices
sudo nmcli con up <connection> # bring up a connection
curl ifconfig.me # get external IP
```

## Users and groups

List all users:

```bash
cut -d: -f1 /etc/passwd # all users
awk -F: '$3 >= 1000 {print $1}' /etc/passwd # human users
getent group | awk -F: '{print $1 ": " $4}' # all users per group
```

Adding users

```bash
sudo adduser <username> # add new user
sudo passwd <username> # set/change password
sudo usermod -aG wheel <username> # add user to wheel group (admin rights)
```

## Updates

```bash
sudo dnf update
```

Check if anything was touched in the update:

```bash
dnf history list docker
dnf history list fail2ban
dnf history list firewalld
dnf list installed nginx --showduplicates
```

If it has, restart the affected app, where NAME is the app name => `docker`, `nginx` etc

```bash
sudo systemctl restart NAME
```

Check everything is still working:

```bash
systemctl --failed
sudo systemctl status nginx
sudo systemctl status docker
sudo systemctl status fail2ban
sudo systemctl status firewalld
docker ps
journalctl -xe
```

Check that the website is still up:

```bash
curl -I https://analytics.rocketzip.com.au
```

Check if droplet needs restarting:

```bash
dnf needs-restarting -r
```

If so,

```bash
systemctl reboot
```

Wait a minute, log back in and check everything again.
