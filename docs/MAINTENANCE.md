# Maintaining API documentation

## Single source of truth

| Location | Role |
|----------|------|
| **`docs/`** | Canonical guides — edit here |
| **`README.md`** | Generated — run `python scripts/build_readme.py` |
| **`price_tracker/app/api_docs/`** | Deployment bundle — `../price_tracker/scripts/sync_api_docs.sh` |
| **`price_tracker/.../developers.html`** | Web shell + API key UI only |

## Workflow

1. Edit Markdown under `docs/` (and `docs/integrations/`).
2. Regenerate README: `python scripts/build_readme.py`
3. Sync to the app: `cd ../price_tracker && ./scripts/sync_api_docs.sh`
4. Commit `docs/`, `README.md`, and `price_tracker/app/api_docs/`

Checks:

- `python scripts/build_readme.py --check` — README up to date
- `price_tracker/scripts/verify_api_docs_sync.sh` — bundle matches `docs/`

## Developer page vs README

| Content | README | Developer page |
|---------|--------|----------------|
| API guides + integrations | Yes (full scroll) | Yes |
| Changelog | Yes | No (Releases link in Status only) |
| Interactive API keys | Link only | Yes |
| App intro + link to pricewatcha.com | Yes (README header) | Lead text |

## Placeholders

`{{API_BASE}}`, `{{SITE_BASE}}`, `{{MCP_URL}}`, `{{GITHUB_REPO}}` — substituted on the Developer page; expanded in `build_readme.py` for README.
