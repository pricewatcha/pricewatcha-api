## Claude {#integration-claude}

**What it enables:** Ask Claude to search for products, track prices, check price history, set alerts and manage webhooks, all in natural language, directly in Claude.ai or the Claude desktop app.

### How to connect: Claude.ai (web)

**Step 1: Open the Customize panel**  
Click **Customize** (sliders icon) in the left sidebar of Claude.ai or go to [claude.ai/settings/connectors](https://claude.ai/settings/connectors).

**Step 2: Add a custom connector**  
Under **Connectors**, click **+** to add a new connector.

**Step 3: Enter the MCP server URL**  
Enter a name (e.g. “Pricewatcha”) and paste:

```
{{MCP_URL}}
```

Click **Add**.

**Step 4: Done**  
Pricewatcha appears in your connector list with read-only tools (`get_api_status`, `get_job_status`, `get_product`, `get_price_history`, `search_products`) and write tools (`track_product`). You can now use Pricewatcha in any Claude conversation.

**Step 5: Configure tool permissions (optional)**  
Open the connector in your connector list (or return to [claude.ai/settings/connectors](https://claude.ai/settings/connectors)) and expand **Tool permissions**.

For each tool — or for the whole **Read-only** / **Write** group — choose when Claude may call it:

| Setting | Meaning |
|---------|---------|
| **Always allow** | Claude calls the tool without asking each time |
| **Require approval** | Claude asks before each call (default for new connectors) |
| **Never allow** | Tool is blocked |

For everyday price checks and searches, set the read-only tools (or the whole read-only group) to **Always allow**. For `track_product`, pick **Always allow** if you want friction-free tracking, or keep **Require approval** if you prefer to confirm before a product is tracked.

### How to connect: Claude Desktop App

Same steps: **Customize** → **Connectors** → **Add custom connector** → paste `{{MCP_URL}}`. Tool permissions are configured the same way under **Tool permissions** in the connector settings.

Try:

- *“Find me a refurbished iPhone 15 Pro under €550”*
- *“Track this product URL and show me the price history”*
- *“Set an alert for this product when it drops below €500”*

> **Note:** `track_product` is a write tool because it creates a tracking job in the background. It does not modify or delete existing data.
