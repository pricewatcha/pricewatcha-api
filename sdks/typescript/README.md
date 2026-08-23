# @pricewatcha/sdk

Official TypeScript/JavaScript client for the [Pricewatcha API](https://pricewatcha.com/en/developers) v1.

Turn any product URL into structured price intelligence — with async job polling built in.

## Status

No API key required for read endpoints. Pass `apiKey: "pwk_live_..."` for alerts and webhooks.

## Install

npm publication is planned. For now, install from this repository:

```bash
cd sdks/typescript
npm install
npm run build
```

When published:

```bash
npm install @pricewatcha/sdk
```

*(Not yet available on npm.)*

Requires **Node.js 18+** (native `fetch`).

## Quick start

```typescript
import { PricewatchaClient } from "@pricewatcha/sdk";

const client = new PricewatchaClient();

// Demo product (no scrape)
const demo = await client.getProduct("demo_iphone_15_pro");
console.log(demo.name, demo.current_price, demo.currency);

// Async track + poll
const job = await client.track("https://www.backmarket.de/de-de/p/your-product-path");
const result = await client.waitForJob(job.job_id);
console.log(result);

// One-liner: track (long-poll) then client-side poll until terminal state
const job = await client.trackAndWait(
  "https://www.backmarket.de/de-de/p/your-product-path",
  { timeoutMs: 180_000 },
);
console.log(job.product);
```

## API methods

| Method | HTTP | Description |
|--------|------|-------------|
| `health()` | `GET /health` | Health check |
| `info()` | `GET /api/v1` | API discovery |
| `track(url)` | `POST /track` | Bounded server long-poll (~25s); returns shared job status shape |
| `getJob(jobId)` | `GET /jobs/{id}` | Job status |
| `waitForJob(jobId, options?)` | — | Client-side poll until completed/failed (throws on timeout) |
| `trackAndWait(url, options?)` | — | Client-side: `track` once, then poll `getJob` until terminal state |
| `getProduct(id)` | `GET /products/{id}` | Product intelligence |
| `getPriceHistory(id)` | `GET /products/{id}/price-history` | History & trend |
| `search(query)` | `GET /search?q=` | Full catalog search (name, URL, shop) |
| `createAlert(body)` | `POST /alerts` | Create alert (`notify_on_drop` / `notify_on_rise` and/or thresholds). API key required |
| `listAlerts(options?)` | `GET /alerts` | List alerts. API key required |
| `getAlert(id)` | `GET /alerts/{id}` | Get one alert. API key required |
| `updateAlert(id, body)` | `PATCH /alerts/{id}` | Update alert. API key required |
| `deleteAlert(id)` | `DELETE /alerts/{id}` | Delete alert. API key required |

## Configuration

```typescript
const client = new PricewatchaClient({
  baseUrl: "https://pricewatcha.com/api/v1",
  headers: { "X-Custom": "value" },
});
```

Polling options (`waitForJob`, `trackAndWait`):

- `timeoutMs` — default `180000` (3 minutes)
- `intervalMs` — default `5000` (5 seconds)

## Errors

- `PricewatchaError` — base error
- `PricewatchaAPIError` — HTTP errors, failed jobs (`statusCode`, `detail`)
- `PricewatchaTimeoutError` — polling timeout

## Build & test

```bash
npm install
npm run build
npm test
```

## Privacy

Product-level price intelligence is public through the API. User accounts, emails, watchlists, and alert settings are never returned. See [`docs/privacy-and-data.md`](../../docs/privacy-and-data.md).

## Disclaimer

Prices are informational snapshots. Merchant prices on the retailer site are always authoritative. Not financial advice.
