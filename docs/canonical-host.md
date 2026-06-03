# Canonical hosts

| Service | Production URL |
|---------|----------------|
| **Site + REST API** | `https://pricewatcha.com` (`/api/v1`) |
| **MCP server** | `https://mcp.pricewatcha.com` (Streamable HTTP at `/`) |

All public docs, SDK defaults, and OpenAPI examples use the **apex** site host (no `www`).

## Production checklist

| Area | Setting |
|------|---------|
| **DNS / CDN** | `www.pricewatcha.com` → **301** to `https://pricewatcha.com` |
| **Railway (app)** | Custom domain on apex; `PUBLIC_SITE_URL` / `FRONTEND_URL` = `https://pricewatcha.com` |
| **Railway (MCP)** | Custom domain `mcp.pricewatcha.com`; `PRICEWATCHA_MCP_ISSUER_URL` = `https://mcp.pricewatcha.com`; `PRICEWATCHA_API_BASE_URL` = `https://pricewatcha.com/api/v1` |
| **Supabase Auth** | Redirect URLs include `https://pricewatcha.com/**` (add `www` only until redirect is live) |
| **README / docs** | `scripts/build_readme.py` uses `SITE_BASE` / `API_BASE` / `MCP_URL`; stray `www` in markdown is normalized on build |

## Repo maintenance

After editing markdown under `docs/`:

```bash
python3 scripts/build_readme.py
# In price_tracker repo:
./scripts/sync_api_docs.sh
```
