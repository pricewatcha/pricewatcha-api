## ChatGPT {#integration-chatgpt}

**What it enables:** Search products, track prices, get price history, watch products for continuous updates, set price alerts and manage webhooks, directly in ChatGPT via MCP.

Pricewatcha is available as an approved ChatGPT plugin in the official Plugins store.

**Step 1:** Open **Plugins** in the ChatGPT sidebar and search for **Pricewatcha**.

**Step 2:** Open the listing and click **Install plugin**.

**Step 3:** Confirm **Connect Pricewatcha** on the authorization screen. ChatGPT may briefly open a Pricewatcha sign-in page to complete OAuth.

**Step 4: Done.** Example prompts:

- *“Search for a refurbished iPhone 15 Pro under €550”*
- *“Track this product URL and show me the price history”*
- *“Watch this product so prices keep updating, then list my watchlist”*
- *“Notify me whenever this product gets cheaper — no price target”*

Alert and watchlist tools (`create_price_alert`, `watch_product`, `list_watchlist`, …) need a Pricewatcha API key (`pwk_live_...`). Creating an alert also watches the product for continuous scheduler updates.

**Optional for other MCP clients:** the remote MCP URL is `{{MCP_URL}}`. Connector logo (PNG, max 10 KB): [download from {{SITE_BASE}}/static/img/mcp/chatgpt-logo.png]({{SITE_BASE}}/static/img/mcp/chatgpt-logo.png).
