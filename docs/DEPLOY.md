# Deploying Forge to your server

Forge runs as two containers:

- **web** (Caddy): serves the app over HTTPS and gets the certificate automatically.
- **pocketbase**: the API and database.

All your data lives in the `pb_data` Docker volume.

## 1. Requirements

- A Linux server (1 vCPU and 1 GB RAM is plenty) with **Docker** and the **Docker Compose plugin** installed.
- A domain or subdomain, e.g. `work.example.com`.
- Ports **80** and **443** open in your firewall. Port 80 is needed for the certificate challenge.

## 2. DNS

Create an **A record** (and an **AAAA** record if your server has IPv6) pointing your domain at the server's IP. Wait until `ping work.example.com` shows the server's IP.

## 3. Install

```bash
git clone <your repo url> forge && cd forge
bash scripts/setup.sh        # first run creates .env and stops
nano .env                    # set DOMAIN, ADMIN_EMAIL, ADMIN_IPS
bash scripts/setup.sh        # builds, starts, asks for your password, creates your login
```

At the end it prints a separate, random **admin dashboard password**. Save it in your password manager: it is shown once, and it is deliberately different from the app password you type on your phone.

Then open `https://<DOMAIN>` and sign in. To install it on your phone:

- **Android (Chrome):** menu → *Install app*.
- **iPhone (Safari):** Share → *Add to Home Screen*. This is also what enables notifications later.

## 4. Updating

```bash
git pull
docker compose up -d --build
```

Database migrations in `server/pb_migrations` apply automatically when PocketBase starts. Open copies of the app pick up the new version the next time they load.

## 5. Admin dashboard

Two ways to open the PocketBase admin:

- **SSH tunnel (default, nothing exposed):** run `ssh -L 8090:127.0.0.1:8090 you@your-server`, then open http://localhost:8090/_/ on your computer.
- **Directly at `https://<DOMAIN>/_/`:** add your home IP to `ADMIN_IPS` in `.env` and run `docker compose up -d`. Everyone else gets 403 — on the dashboard and on the admin API behind it (superuser login, settings, backups, logs, collection management). The app's own API stays open to your devices.

## 6. Backups

- PocketBase makes a **backup every night at 03:00** and keeps the **last 14**, inside the `pb_data` volume (`/pb/pb_data/backups`).
- **List them:** `docker compose exec pocketbase ls -lh /pb/pb_data/backups`
- **Copy one off the server:** `docker compose cp pocketbase:/pb/pb_data/backups/<file>.zip .`
- **Restore:** in the admin dashboard, go to *Settings → Backups*, pick the backup, then *Restore*. PocketBase restarts with that data.
- **Off-site:** in *Settings → Backups*, enable **S3 storage** to send backups to any S3-compatible bucket (Backblaze B2, Cloudflare R2, AWS, …).

## 7. Security notes

- **Accounts:** public sign-up is disabled. The only account is the one `setup.sh` created.
- **Access rules:** every collection requires a signed-in user.
- **Login attempts:** rate-limited, and PocketBase sees your real IP through Caddy.
- **Two-step login:** you can turn on **MFA/OTP** for the `users` collection in the admin dashboard (*Collections → users → Options*).
- **Your password:** to change it, use the admin dashboard (*Collections → users*).

## Local development

```bash
bash scripts/pb-dev.sh                                   # PocketBase on 127.0.0.1:8090 (downloads the pinned binary)
bash scripts/dev-user.sh dev@forge.test devpassword123   # once, in another terminal
npm --prefix app install && npm --prefix app run dev     # app on http://localhost:5173
```

Tests: `npm --prefix app test`. The sync integration test needs the server running, so run it as `PB_URL=http://127.0.0.1:8090 npm --prefix app test -- --run src/sync/engine.int`. Server checks: `bash server/test/smoke.sh`.
