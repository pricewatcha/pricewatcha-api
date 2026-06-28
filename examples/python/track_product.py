#!/usr/bin/env python3
"""Example: track a product URL and wait for structured price intelligence.

No API key required.
Requires: pip install -e sdks/python  (from repository root)
"""

from __future__ import annotations

import json
import os
import sys

from pricewatcha import Pricewatcha, PricewatchaAPIError, PricewatchaTimeoutError

BASE_URL = os.environ.get("PRICEWATCHA_API_BASE", "https://pricewatcha.com/api/v1")
# Use a real product URL, or set PRICEWATCHA_DEMO=1 to fetch demo catalog only
PRODUCT_URL = os.environ.get(
    "PRICEWATCHA_PRODUCT_URL",
    "https://www.backmarket.de/de-de/p/apple-iphone-15-pro-128gb-titanium-natural/00000000-0000-0000-0000-000000000001",
)
USE_DEMO = os.environ.get("PRICEWATCHA_DEMO", "").lower() in ("1", "true", "yes")


def main() -> int:
    client = Pricewatcha(base_url=BASE_URL)

    print(f"API: {BASE_URL}\n")

    health = client.health()
    print("Health:", health)

    if USE_DEMO:
        print("\n--- Demo product (no scrape) ---")
        product = client.get_product("demo_iphone_15_pro")
        print(json.dumps(product, indent=2))
        return 0

    print(f"\n--- Track and wait: {PRODUCT_URL[:80]}... ---\n")
    try:
        job = client.track(PRODUCT_URL)
        print("Job accepted:", job)
        result = client.wait_for_job(job["job_id"], timeout=180, interval=5)
        print("\nJob completed:")
        print(json.dumps(result, indent=2))
    except PricewatchaTimeoutError as exc:
        print(f"Timeout: {exc}", file=sys.stderr)
        return 1
    except PricewatchaAPIError as exc:
        print(f"API error: {exc}", file=sys.stderr)
        return 1
    finally:
        client.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
