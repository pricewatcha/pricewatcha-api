# Authentication {#authentication}

<span class="developers-label developers-label--public">Public</span>

No credential required for catalog [search](search.md), product detail, price history and [async track/poll](async-workflows.md).

<span class="developers-label developers-label--auth">Requires auth</span>

Protected API v1 endpoints (alerts, webhooks, authenticated track callbacks) use:

```http
Authorization: Bearer pwk_live_…
```

| Credential | Format | When to use |
|------------|--------|-------------|
| **API key** | `pwk_live_…` | **Recommended** for scripts, agents, n8n and server integrations. Create on the [Developer page](https://pricewatcha.com/en/developers#api-keys). |
| **Login session token** | JWT from `POST {{SITE_BASE}}/api/auth/login` | Website UI and [headless key bootstrap](#api-keys-headless-bootstrap) only |

Do not use the login session token for alerts, webhooks or other API v1 calls once you have an API key.

See [Access model](#access-model) for which routes are public vs authenticated.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
