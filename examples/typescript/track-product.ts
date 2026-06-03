/**
 * Example: track a product URL and wait for structured price intelligence.
 *
 * Public preview — no API key required.
 * Run from repository root:
 *   cd sdks/typescript && npm install && npm run build
 *   npx tsx ../examples/typescript/track-product.ts
 */

// After `npm run build` in sdks/typescript, use: import { ... } from "@pricewatcha/sdk";
import {
  PricewatchaClient,
  PricewatchaAPIError,
  PricewatchaTimeoutError,
} from "../../sdks/typescript/src/index.js";

const BASE_URL = process.env.PRICEWATCHA_API_BASE ?? "https://pricewatcha.com/api/v1";
const PRODUCT_URL =
  process.env.PRICEWATCHA_PRODUCT_URL ??
  "https://www.backmarket.de/de-de/p/apple-iphone-15-pro-128gb-titanium-natural/00000000-0000-0000-0000-000000000001";
const USE_DEMO = ["1", "true", "yes"].includes(
  (process.env.PRICEWATCHA_DEMO ?? "").toLowerCase(),
);

async function main(): Promise<void> {
  const client = new PricewatchaClient({ baseUrl: BASE_URL });

  console.log(`API: ${BASE_URL}\n`);

  const health = await client.health();
  console.log("Health:", health);

  if (USE_DEMO) {
    console.log("\n--- Demo product (no scrape) ---");
    const product = await client.getProduct("demo_iphone_15_pro");
    console.log(JSON.stringify(product, null, 2));
    return;
  }

  console.log(`\n--- Track and wait: ${PRODUCT_URL.slice(0, 80)}... ---\n`);

  try {
    const job = await client.track(PRODUCT_URL);
    console.log("Job accepted:", job);
    const result = await client.waitForJob(job.job_id, {
      timeoutMs: 180_000,
      intervalMs: 5_000,
    });
    console.log("\nJob completed:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    if (err instanceof PricewatchaTimeoutError) {
      console.error("Timeout:", err.message);
      process.exit(1);
    }
    if (err instanceof PricewatchaAPIError) {
      console.error("API error:", err.message);
      process.exit(1);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
