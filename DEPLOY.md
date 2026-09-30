# Deploying CryptoGuard to the VPS (Traefik)

Target: `https://cryptoguard.olamide.cloud`

```
Internet ─► Traefik :443 (TLS, ACME) ─► web container (Nginx: static + rate-limited /api) ─► api container (FastAPI)
```

- Only `web` joins Traefik's network. `api` sits on a private network and is never exposed.
- No host ports are published. Traefik finds `web` through its Docker labels.
- TLS certificates come from your existing Traefik certificate resolver.

Run these commands on the VPS unless a step says otherwise.

## 1. DNS

At your DNS provider, add an **A record** `cryptoguard` → your VPS IPv4 address (plus an AAAA record if you use IPv6).
Check it from any machine:

```bash
dig +short cryptoguard.olamide.cloud
```

## 2. Read your Traefik settings

CryptoGuard needs three names from your Traefik setup: the Docker network, the HTTPS entrypoint and the certificate resolver.
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
| `traefik.docker.network=…` | `TRAEFIK_NETWORK`. If the label is missing, use the network from `docker inspect malwarecnn --format '{{json .NetworkSettings.Networks}}'` |
| `…routers.<name>.entrypoints=…` | `TRAEFIK_ENTRYPOINT` |
| `…routers.<name>.tls.certresolver=…` | `TRAEFIK_CERTRESOLVER` |

## 3. Get the code onto the VPS

**Option A: GitHub.** On your Mac, create an empty `cryptoguard` repo under `0la-mide`, then push:

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

## 4. Configure

```bash
cd /opt/cryptoguard && cp .env.example .env && nano .env
```

Set the three `TRAEFIK_*` values from step 2.

## 5. Build and start

```bash
cd /opt/cryptoguard && docker compose up -d --build
```

The first build takes a few minutes (numpy, scipy and matplotlib wheels, plus the React build).
Traefik picks the container up automatically. It doesn't need a restart.

## 6. Verify

```bash
docker compose -f /opt/cryptoguard/docker-compose.yml ps
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
cd /opt/cryptoguard && git pull && docker compose up -d --build
```

(With option B, re-run the rsync and then `docker compose up -d --build`.)

## Troubleshooting

```bash
docker compose -f /opt/cryptoguard/docker-compose.yml logs -f --tail=100
```

- **`network traefik declared as external, but could not be found`:** `TRAEFIK_NETWORK` in `.env` doesn't match. Check `docker network ls`.
- **Traefik returns 404:** Traefik isn't seeing the router. Check the Traefik container's logs, confirm `web` shares its network
  (`docker network inspect <network>`), and if Traefik runs with `exposedByDefault=false`, confirm `traefik.enable=true` is set (it is by default here).
- **Certificate warning / default Traefik cert:** `TRAEFIK_CERTRESOLVER` is wrong, or DNS wasn't pointing at the VPS when Traefik first tried.
  Fix it, then run `docker compose up -d` again.
- **Plain http:// doesn't redirect:** HTTP→HTTPS redirects are normally set once, on Traefik's `web` entrypoint. If yours relies on
  per-router redirects, copy the redirect labels MalwareCNN uses.
- **429 in the UI:** the per-IP rate limit (2 simulations/s, 6 PDFs/min) is working. Tune it in `frontend/nginx.conf`.
