# Ops Notes

## nginx

`nginx/momcozy-audit.conf` defines the server block for Tencent Cloud production.

Key behaviour:
- `location ^~ /data/ { return 404; }` — all `/data/*` requests return a real
  HTTP 404, not the homepage. This prevents accidental exposure of data paths.
- `try_files $uri $uri/ =404` — unknown paths return a real HTTP 404.
- `error_page 404 /404.html` with `internal` — the custom 404 page is served
  for all not-found responses without revealing internal routing.

**Before installation**, replace `audit.example.invalid` with the real hostname.

## Tencent Cloud Deployment

The `tencent.yml` workflow deploys via SSH. Required repository secrets:

| Secret | Description |
|---|---|
| `DEPLOY_SSH_KEY` | Contents of the deploy private key (Ed25519 recommended) |
| `DEPLOY_HOST` | Server hostname or IP |
| `DEPLOY_ROOT` | Absolute path to the deployment root (e.g. `/srv/lute-momcozy-audit`) |
| `DEPLOY_USER` | SSH user that owns `DEPLOY_ROOT` |
| `PUBLIC_URL` | Publicly reachable HTTPS base URL (no trailing slash) |

### Deployment flow

1. CI builds `_site/` and generates a SHA-256 manifest (`site.sha256`)
2. Uploads to a staging directory: `${DEPLOY_ROOT}/staging/${GITHUB_SHA}/`
3. Takes a backup of live to: `${DEPLOY_ROOT}/workflow-backups/${GITHUB_SHA}/html/`
4. Atomically rsync-swaps staging into `${DEPLOY_ROOT}/html/`
5. Verifies integrity by re-checking SHA-256 on the live copy
6. Smoke-tests HTTP 200/404 responses via `curl`
7. On any error: rolls back from the backup automatically

### Server directory layout

```
${DEPLOY_ROOT}/
  html/                    <- live web root (nginx root)
  staging/${SHA}/          <- cleaned up after deploy
  workflow-backups/${SHA}/ <- one backup per deploy, owned by the workflow user
```

### Recommended server permissions

```bash
sudo chown -R deploy-user:www-data ${DEPLOY_ROOT}/html
sudo chmod -R 750 ${DEPLOY_ROOT}/html
```
