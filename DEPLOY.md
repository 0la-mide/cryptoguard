# Deploying CryptoGuard to the VPS (Traefik)

Target: `https://cryptoguard.olamide.cloud`

```
Internet ─► Traefik :443 (TLS, ACME) ─► web container (Nginx: static + rate-limited /api) ─► api container (FastAPI)
```

- Both containers use a project bridge network. The API is never published to the host.
- No host ports are published in production. Host-networked Traefik reaches `web` through its Docker labels.
- TLS certificates come from your existing Traefik certificate resolver.

Run these commands on the VPS unless a step says otherwise.

## 1. DNS

At your DNS provider, add an **A record** `cryptoguard` → your VPS IPv4 address (plus an AAAA record if you use IPv6).
Check it from any machine:

```bash
dig +short cryptoguard.olamide.cloud
```

## 2. Read your Traefik settings

CryptoGuard needs two names from your Traefik setup: the HTTPS entrypoint and the certificate resolver.
The easiest place to find them is the labels on a container Traefik already routes, such as MalwareCNN.

```bash
docker ps --format '{{.Names}}'
```

Then, with the MalwareCNN container's name in place of `malwarecnn`:

```bash
docker inspect malwarecnn --format '{{json .Config.Labels}}' | tr ',' '\n' | grep traefik
```

Look for:

| Label | Setting in `.env` |
|---|---|
| `…routers.<name>.entrypoints=…` | `TRAEFIK_ENTRYPOINT` |
| `…routers.<name>.tls.certresolver=…` | `TRAEFIK_CERTRESOLVER` |

## 3. Get the code onto the VPS

**Option A: GitHub.** On your Mac, create an empty `cryptoguard` repo under `0la-mide`, then push:

```bash
cd ~/CryptoGuard && git remote add origin git@github.com:0la-mide/cryptoguard.git && git push -u origin main
```

On the VPS, using the repository-specific deploy-key alias:

```bash
mkdir -p /opt/cryptoguard && cd /opt/cryptoguard
git clone git@github-cryptoguard:0la-mide/cryptoguard.git current
```

**Option B: copy directly** from your Mac (replace `user@vps`):

```bash
rsync -av --exclude .venv --exclude node_modules --exclude dist --exclude .git ~/CryptoGuard/ user@vps:/opt/cryptoguard/
```

## 4. Configure

```bash
cd /opt/cryptoguard/current && cp .env.example .env && nano .env
```

Set `DOMAIN`, `TRAEFIK_ENTRYPOINT`, and `TRAEFIK_CERTRESOLVER` from step 2.

## 5. Build and start

```bash
cd /opt/cryptoguard/current && docker compose up -d --build
```

The first build takes a few minutes (numpy, scipy and matplotlib wheels, plus the React build).
Traefik picks the container up automatically. It doesn't need a restart.

## 6. Verify

```bash
docker compose -f /opt/cryptoguard/current/docker-compose.yml ps
```

```bash
curl -s https://cryptoguard.olamide.cloud/api/health
```

The second command should print `{"status":"ok"}`. Then, in a browser:

- The lab opens in **Beginner** mode with the welcome screen. Pick a scenario, press Run, and read the explanation.
- **Pro** mode runs the default simulation straight away.
- **Save PDF / Export PDF** downloads a report.
- On a phone you get the "use a tablet or PC" screen.

## Updating later

```bash
cd /opt/cryptoguard/current
git pull --ff-only origin main
docker compose up -d --build
```

(With option B, re-run the rsync and then `docker compose up -d --build`.)

## Troubleshooting

```bash
docker compose -f /opt/cryptoguard/current/docker-compose.yml logs -f --tail=100
```

- **Traefik returns 404:** Traefik isn't seeing the router. Check the Traefik logs and confirm `traefik.enable=true` is present. With this VPS's host-networked Traefik, no shared external Docker network is required.
- **Certificate warning / default Traefik cert:** `TRAEFIK_CERTRESOLVER` is wrong, or DNS wasn't pointing at the VPS when Traefik first tried.
  Fix it, then run `docker compose up -d` again.
- **Plain http:// doesn't redirect:** HTTP→HTTPS redirects are normally set once, on Traefik's `web` entrypoint. If yours relies on
  per-router redirects, copy the redirect labels MalwareCNN uses.
- **429 in the UI:** the per-IP rate limit (2 simulations/s, 6 PDFs/min) is working. Tune it in `frontend/nginx.conf`.
