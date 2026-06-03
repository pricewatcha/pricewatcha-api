## API endpoints (overview)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | - | Health check |
| `GET` | `/api/v1` | - | Discovery and disclaimer |
| `POST` | `/api/v1/track` | - | URL ingestion (long-poll) |
| `GET` | `/api/v1/jobs/{jobId}` | - | Job status |
| `GET` | `/api/v1/products/{productId}` | - | Product intelligence |
| `GET` | `/api/v1/products/{productId}/price-history` | - | History and trend |
| `GET` | `/api/v1/search?q=` | - | Keyword search (`limit` max 200) |
| `GET` | `/api/v1/openapi.json` | - | Live OpenAPI 3.1 |
| `POST` | `/api/auth/login` | - | Login (short-lived session token) |
| `POST` | `/api/keys` | Session token | Create API key |
| `GET` / `DELETE` | `/api/keys` … | Session token or key | List / revoke keys |
| `*` | `/api/v1/alerts` … | API key | Price alerts |
| `*` | `/api/v1/webhooks` … | API key | Webhook subscriptions |

Machine-readable contract: [openapi/openapi.yaml](openapi/openapi.yaml) · Live: `GET {{API_BASE}}/openapi.json`
