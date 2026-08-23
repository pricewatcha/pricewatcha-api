## ChatGPT {#integration-chatgpt}

**What it enables:** Search products, track prices, get price history, set price alerts and manage webhooks, directly in ChatGPT via MCP.

> **Prerequisite: Developer Mode (one-time)**  
> Custom MCP connectors require Developer Mode: **Settings → Advanced** → enable **Developer Mode**. Available on Plus, Pro, Team, Business, Enterprise and Edu (not on the free plan). Pricewatcha tools only work while Developer Mode stays on.

**Step 1:** Go to **Settings → Apps** and click **Add custom connector**.

**Step 2:** Paste the MCP URL:

```
{{MCP_URL}}
```

**Optional connector logo:** PNG, max 10 KB. [Download from {{SITE_BASE}}/static/img/mcp/chatgpt-logo.png]({{SITE_BASE}}/static/img/mcp/chatgpt-logo.png)

**Step 3: Authentication:** Select **OAuth**. ChatGPT handles the flow; you may see a brief authorization prompt on first connect.

**Step 4: Done.** Example prompts:

- *“Search for a refurbished iPhone 15 Pro under €550”*
- *“Track this product URL and show me the price history”*
- *“Notify me whenever this product gets cheaper — no price target”*

> **Warning:** ChatGPT may show a **DEV** label on unverified third-party connectors. Pricewatcha only works while **Developer Mode** is enabled.
