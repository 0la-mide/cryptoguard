# Deploying CryptoGuard to the VPS

Target: `https://cryptoguard.olamide.cloud`

The layout on the VPS is two containers, with only the `web` one published, on `127.0.0.1:8081`:

```
Internet ─► host Nginx :443 (TLS, certbot) ─► 127.0.0.1:8081 web (Nginx: static + rate-limited /api) ─► api:8000 (FastAPI)
```

These steps assume Ubuntu/Debian with Nginx already on the host (as for `malwarecnn.olamide.cloud`).
Run the commands on the VPS unless a step says otherwise.

## 1. DNS

At your DNS provider, add an **A record** `cryptoguard` → your VPS IPv4 address (plus an AAAA record if you use IPv6).
Check it from any machine:

```bash
dig +short cryptoguard.olamide.cloud
```

## 2. Get the code onto the VPS

**Option A: GitHub** (the About page links to `github.com/0la-mide/cryptoguard`, so this repo needs to exist).
On your Mac, create an empty `cryptoguard` repo on GitHub, then:

```bash
cd ~/CryptoGuard && git remote add origin git@github.com:0la-mide/cryptoguard.git && git push -u origin main
```

On the VPS:

```bash
sudo mkdir -p /opt/cryptoguard && sudo chown $USER /opt/cryptoguard && git clone https://github.com/0la-mide/cryptoguard.git /opt/cryptoguard
```

**Option B: copy directly** from your Mac (replace `user@vps`):

```bash
rsync -av --exclude .venv --exclude node_modules --exclude dist --exclude .git ~/CryptoGuard/ user@vps:/opt/cryptoguard/
```

## 3. Docker (skip if `docker compose version` already works)

```bash
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER
```

Log out and back in so the group change applies.

## 4. Build and start

```bash
cd /opt/cryptoguard && docker compose up -d --build
```

The first build takes a few minutes (numpy, scipy and matplotlib wheels, plus the React build). Then check it:

```bash
curl -s http://127.0.0.1:8081/api/health
```

This should print `{"status":"ok"}`. If port 8081 is already taken on the VPS, change it in `docker-compose.yml` and in step 5.

## 5. Host Nginx site

```bash
sudo cp /opt/cryptoguard/deploy/cryptoguard.olamide.cloud.conf /etc/nginx/sites-available/ && sudo ln -s /etc/nginx/sites-available/cryptoguard.olamide.cloud.conf /etc/nginx/sites-enabled/
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo certbot --nginx -d cryptoguard.olamide.cloud
```

Choose the redirect option when asked. Certbot sets up auto-renewal.

## 7. Verify

- `https://cryptoguard.olamide.cloud` loads the lab and runs the default simulation.
- **Export PDF** downloads a report.
- On a phone you get the "use a tablet or PC" screen.

## Updating later

```bash
cd /opt/cryptoguard && git pull && docker compose up -d --build
```

(With option B, re-run the rsync and then `docker compose up -d --build`.)

## Troubleshooting

```bash
docker compose -f /opt/cryptoguard/docker-compose.yml logs -f --tail=100
```

- **502 from the host Nginx:** the containers aren't up. Run `docker compose ps`.
- **429 in the UI:** the per-IP rate limit (2 simulations/s, 6 PDFs/min) is working. Tune it in `frontend/nginx.conf`.
- **No `sites-available`** (e.g. RHEL-style Nginx): copy the conf into `/etc/nginx/conf.d/` instead.
