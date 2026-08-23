# Maintaining API documentation

## Single source of truth

| Location | Role |
|----------|------|
| **`docs/`** | Canonical guides — edit here |
| **`README.md`** | Generated — run `python scripts/build_readme.py` |
| **`openapi/openapi.yaml`** | GitHub OpenAPI contract (SDKs / generators) |
| **`price_tracker/app/api/v1/openapi_spec.py`** | Live `GET /api/v1/openapi.json` — **not** generated from the YAML |
| **`price_tracker/app/api_docs/`** | Deployment bundle — `../price_tracker/scripts/sync_api_docs.sh` |
| **`mcp-server/src/tools/`** + **`mcp/tools.schema.json`** | MCP tool descriptions |
| **`price_tracker/.../developers.html`** | Web shell + API key UI only |

## Workflow

1. Edit Markdown under `docs/` (and `docs/integrations/`, including `changelog.md`).
2. Regenerate README: `python scripts/build_readme.py`
3. Update **both** OpenAPI copies: `openapi/openapi.yaml` **and** `../price_tracker/app/api/v1/openapi_spec.py`
4. Sync to the app: `cd ../price_tracker && ./scripts/sync_api_docs.sh`
5. If an MCP tool changed: update the tool file and `mcp/tools.schema.json`
6. Commit in **both** repos (`docs/`, `README.md`, `openapi/`, MCP files, and `price_tracker/app/api_docs/` + `openapi_spec.py`)

Checks:

- `python scripts/build_readme.py --check` — README up to date
- `python scripts/verify_openapi_query_descriptions.py` — every query param in `openapi.yaml` has a description
- `price_tracker/scripts/verify_api_docs_sync.sh` — bundle matches `docs/`
- CI workflow **Docs and OpenAPI** runs the first two on every push/PR

## Developer page vs README

| Content | README | Developer page |
|---------|--------|----------------|
| API guides + integrations | Yes (full scroll) | Yes |
| Changelog | Yes | Yes (`#changelog`) |
| Interactive API keys | Link only | Yes |
| App intro + link to pricewatcha.com | Yes (README header) | Lead text |

## Placeholders

`{{API_BASE}}`, `{{SITE_BASE}}`, `{{MCP_URL}}`, `{{GITHUB_REPO}}` — substituted on the Developer page; expanded in `build_readme.py` for README.
