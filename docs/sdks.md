# SDKs {#sdks}

Official **Python** and **TypeScript** client libraries live in [`sdks/`]({{GITHUB_REPO}}/tree/main/sdks) on GitHub.

They support the async **track → poll → read** workflow. Use the OpenAPI schema or plain HTTP from any other language.

## Python

```python
from pricewatcha import Pricewatcha

client = Pricewatcha()  # public endpoints, no key needed

# With an API key (alerts, webhooks, …)
client = Pricewatcha(api_key="pwk_live_YOUR_KEY")
```

Install from the [Python SDK]({{GITHUB_REPO}}/tree/main/sdks/python) on GitHub. Setup: [sdks/python/README.md]({{GITHUB_REPO}}/blob/main/sdks/python/README.md).

## TypeScript

```typescript
import { PricewatchaClient } from "@pricewatcha/sdk";

const client = new PricewatchaClient();  // public endpoints, no key needed

const authedClient = new PricewatchaClient({ apiKey: "pwk_live_YOUR_KEY" });
```

Install from the [TypeScript SDK]({{GITHUB_REPO}}/tree/main/sdks/typescript) on GitHub. Setup: [sdks/typescript/README.md]({{GITHUB_REPO}}/blob/main/sdks/typescript/README.md).

## Client generation

Generate clients in other languages from the [OpenAPI spec]({{GITHUB_REPO}}/blob/main/openapi/openapi.yaml) or live `GET {{API_BASE}}/openapi.json` (OpenAPI Generator, Speakeasy, Kiota and similar tools).

---

**Official documentation (full guides):** https://pricewatcha.com/en/developers
