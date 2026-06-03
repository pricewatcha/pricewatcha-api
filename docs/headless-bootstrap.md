## Headless key bootstrap (for agents) {#api-keys-headless-bootstrap}

If an agent must obtain API credentials without a browser, authenticate once with the same email and password as on the website, create an API key, then use `pwk_live_…` for all further calls. This is not a separate agent login: it is the normal Pricewatcha account login exposed as an HTTP endpoint.

### How login via API works

`POST {{SITE_BASE}}/api/auth/login` accepts JSON `email` and `password` and returns a short-lived `access_token` (login session token). The [Developer page](https://pricewatcha.com/en/developers) login modal calls the same endpoint; in a script or agent you call it directly with `curl` or your HTTP client.

- You need an existing account (register on the site or via `POST {{SITE_BASE}}/api/auth/register`).
- The email must be verified: otherwise the API returns **403**.
- Wrong credentials return **401**.
- Use `access_token` only to create keys; for alerts and webhooks use the `pwk_live_…` key from step 2.

**Step 1: Login**

```bash
curl -s -X POST "{{SITE_BASE}}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "YOUR_PASSWORD"}'
```

**Response** (HTTP 200), `AuthResponse`:

- `access_token` (string): login session token (JWT)
- `token_type` (string): always `"bearer"`
- `user` (object): `id` (string, UUID), `email` (string), `email_verified` (boolean)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "you@example.com",
    "email_verified": true
  }
}
```

Send the token as `Authorization: Bearer <access_token>` in step 2. Session tokens expire; do not store them as the long-term credential for an agent.

**Step 2: Create API key**

```bash
curl -s -X POST "{{SITE_BASE}}/api/keys" \
  -H "Authorization: Bearer ACCESS_TOKEN_FROM_STEP_1" \
  -H "Content-Type: application/json" \
  -d '{"name": "agent bootstrap"}'
```

**Response** (HTTP 200), `CreateApiKeyResponse`:

- `id` (integer): key ID
- `name` (string): label from the request
- `key_prefix` (string): first 12 characters of the key (for display)
- `key` (string): full secret; returned only on create, not on list
- `is_active` (boolean)
- `created_at` (string, ISO 8601 datetime)
- `last_used_at` (string or `null`)
- `revoked_at` (string or `null`)

```json
{
  "id": 42,
  "name": "agent bootstrap",
  "key_prefix": "pwk_live_ab",
  "key": "pwk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "is_active": true,
  "created_at": "2026-05-27T14:30:00.123456",
  "last_used_at": null,
  "revoked_at": null
}
```

Store `key` securely. Use it on alerts, webhooks and other protected API v1 endpoints, not the session token from step 1.

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
