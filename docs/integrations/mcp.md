# AI Agents & MCP {#mcp}

Pricewatcha exposes a **remote MCP endpoint**: no local installation required. Connect your AI client with the URL below. Available tools include catalog reads (`get_api_status`, `search_products`, `track_product`, `get_job_status`, `get_product`, `get_price_history`) and price alerts (`create_price_alert`, `list_price_alerts`, `get_price_alert`, `update_price_alert`, `delete_price_alert`). Alert tools require a Pricewatcha API key and can notify on any drop or rise without a numeric threshold.

```
{{MCP_URL}}
```

For step-by-step setup, see [Claude](#integration-claude), [ChatGPT](#integration-chatgpt), [n8n](#integration-n8n) and [Make](#integration-make) below.
