---
title: "How to Deploy Cookiecutter Django on a DigitalOcean Droplet (Ubuntu 22.04+)"
seoTitle: "Deploy Cookiecutter Django on a DigitalOcean Droplet"
description: "Deploy Cookiecutter Django to a DigitalOcean droplet with Docker and Traefik: hardening, firewall, HTTPS, backups and restarts."
pubDate: 2025-04-15
updatedDate: 2026-10-04
pillar: build
tags: ["Cookiecutter Django","Django","Docker","Ubuntu","DigitalOcean"]
legacyUrl: "/insights/how-to-deploy-cookiecutter-django-on-a-digitalocean-droplet-ubuntu-2204/"
gsc12mo: "31 clicks / 3,715 impr / pos 11.8"
---

To deploy a [Cookiecutter Django](https://github.com/cookiecutter/cookiecutter-django) project on a DigitalOcean droplet, you harden a fresh Ubuntu server, open ports 22, 80 and 443, install Docker, copy your project and its production `.env` files onto the server, and start `docker-compose.production.yml`. Traefik, which ships with the template, gets the HTTPS certificate from Let's Encrypt on its own.

This is the order I use for a first production deploy, including the parts that tend to cause problems later: the firewall, backups, and getting the app to come back after a reboot.

## Before you start

- A Cookiecutter Django project generated with your real domain name. The template writes that domain into the Traefik config and the Django Sites setup, so it saves you two edits later.
- A DigitalOcean droplet running Ubuntu 22.04 LTS or later (24.04 and 26.04 work the same way), with your SSH key added when you create it.
- DNS **A records** for both `yourdomain.com` and `www.yourdomain.com` pointing at the droplet's IP. When the domain is an apex domain, the template's Traefik rule answers on both, so both need to resolve or the certificate request can fail.

The server steps below are standard Ubuntu setup and are the same on every current LTS release.

## 1. Connect and update

```bash
ssh root@YOUR_DROPLET_IP
apt-get update && apt-get upgrade -y
```

## 2. Create your own user

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Open a **second** terminal and confirm `ssh deploy@YOUR_DROPLET_IP` works before you go further. If anything goes wrong in the next step, your first session is still open.

## 3. Lock down SSH

Cloud images add their own SSH settings in `/etc/ssh/sshd_config.d/` (DigitalOcean's `50-cloud-init.conf` can turn password login back on). SSH uses the first value it reads, and that folder is read before the main config file, so edits to `/etc/ssh/sshd_config` can be silently ignored. Put your settings in a file in that folder whose name sorts first:

```bash
printf 'PermitRootLogin no\nPasswordAuthentication no\n' | sudo tee /etc/ssh/sshd_config.d/00-hardening.conf
```

Then check what SSH will actually use:

```bash
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication'
```

Both should say `no`. Then restart SSH (`sudo systemctl restart ssh`) and test a new login before closing your old session.

## 4. Open the firewall, including port 80

```bash
sudo ufw allow OpenSSH
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

Port 80 isn't optional. Traefik proves to Let's Encrypt that you own the domain over port 80, then redirects all plain-HTTP traffic to HTTPS. Without it, the certificate request fails.

One thing that catches people out: Docker writes its own firewall rules, and ports published by a container skip ufw entirely. The template's production compose file publishes 80, 443, and 5555 if you enabled Celery (that's Flower, the Celery dashboard). Port 5555 is published by the `traefik` service, which routes it to Flower. Flower sits behind a password and HTTPS, but if you don't need it reachable from the internet, remove the `'0.0.0.0:5555:5555'` line from the `traefik` service's `ports`, or change it to `'127.0.0.1:5555:5555'` and reach it over an SSH tunnel.

## 5. Install Docker

Follow Docker's official guide for Ubuntu, using the apt repository method: [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository). It installs the Compose plugin, so the command is `docker compose`, not `docker-compose`.

Then let your user run Docker without sudo, per the [post-install steps](https://docs.docker.com/engine/install/linux-postinstall/):

```bash
sudo usermod -aG docker $USER
```

Log out and back in so the group change takes effect.

## 6. Give the server read access to your repository

Create a key on the server:

```bash
ssh-keygen -t ed25519 -C "deploy@yourdomain.com"
cat ~/.ssh/id_ed25519.pub
```

Add it to the repository on GitHub as a **deploy key** (repository **Settings → Deploy keys**), read-only. A deploy key only opens that one repository. Adding the server's key to your personal GitHub account would give the server access to everything you can see.

Then clone:

```bash
git clone git@github.com:YOUR_ACCOUNT/YOUR_PROJECT.git
cd YOUR_PROJECT
```

## 7. Copy the production settings

The `.envs/.production/` folder holds your secrets and isn't in Git. Copy it from your machine:

```bash
ssh deploy@YOUR_DROPLET_IP mkdir -p YOUR_PROJECT/.envs
scp -r .envs/.production deploy@YOUR_DROPLET_IP:~/YOUR_PROJECT/.envs/
```

Before the first start, check two things:

- `DJANGO_ALLOWED_HOSTS` in `.envs/.production/.django` matches your domain. The template's default, `.yourdomain.com` with a leading dot, covers `www.` as well.
- The email settings in the same file are filled in. A missing or wrong email provider key is the most common cause of a 500 error on sign-up and password reset, because those pages send email.

If you changed domains after generating the project, also update the host rules in `compose/production/traefik/traefik.yml`.

## 8. Build and start

```bash
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml logs -f
```

Watch the logs until Traefik reports the certificate and Django starts without errors, then press Ctrl+C. Run migrations and create your admin account:

```bash
docker compose -f docker-compose.production.yml run --rm django python manage.py migrate
docker compose -f docker-compose.production.yml run --rm django python manage.py createsuperuser
```

The template's data migrations set the Django Sites domain from the domain you generated the project with, so there's nothing to change there unless the domain has changed since.

## 9. Make it start again after a reboot

The production compose file doesn't set a restart policy, so after a reboot or a kernel update the containers stay down until someone starts them. The template's docs suggest supervisor. A small systemd unit does the same job with what Ubuntu already has:

```ini
# /etc/systemd/system/yourproject.service
[Unit]
Description=YOUR_PROJECT (docker compose)
Requires=docker.service
Wants=network-online.target
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
WorkingDirectory=/home/deploy/YOUR_PROJECT
ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now yourproject
```

Reboot once (`sudo reboot`) and confirm the site comes back by itself.

## 10. Back up the database

The template's Postgres container includes backup commands:

```bash
docker compose -f docker-compose.production.yml exec postgres backup
docker compose -f docker-compose.production.yml exec postgres backups      # list them
```

Restoring replaces the database, and Postgres won't drop a database the app is still connected to, so stop the app first:

```bash
docker compose -f docker-compose.production.yml stop django    # and celeryworker, celerybeat, flower if you use Celery
docker compose -f docker-compose.production.yml exec postgres restore BACKUP_FILE_NAME
docker compose -f docker-compose.production.yml up -d
```

Backups are written inside a Docker volume on the same droplet, so they won't help if the droplet itself is lost. Copy them off the server on a schedule (to DigitalOcean Spaces, for example), and turn on DigitalOcean's droplet backups as a second layer.

## 11. Deploying updates

```bash
git pull
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml run --rm django python manage.py migrate
```

Create migrations on your own machine and commit them. Running `makemigrations` on the server produces migration files that exist nowhere else, and the next deploy will conflict with them.

## When something goes wrong

- **No HTTPS certificate:** check that both DNS records resolve to the droplet and that port 80 is open, then read the Traefik logs (`logs -f traefik`).
- **"Bad Request (400)":** the domain isn't in `DJANGO_ALLOWED_HOSTS`.
- **500 error on sign-up or password reset:** the email settings in `.envs/.production/.django`.
- **Site down after a reboot:** step 9.

For local development with the same stack, see my longer guide on [web application development in Django and Docker](/insights/web-application-development-in-django-and-docker/).

*Commands last checked against the current Cookiecutter Django template and Docker's and Ubuntu's documentation in October 2026.*

Sources: [Cookiecutter Django: deployment with Docker](https://cookiecutter-django.readthedocs.io/en/latest/3-deployment/deployment-with-docker.html), [Cookiecutter Django template](https://github.com/cookiecutter/cookiecutter-django), [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [DigitalOcean: Initial server setup with Ubuntu](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu).
