# Public demo catalog

During **public preview**, these product IDs return static sample data without triggering live ingestion. Use them to build and test integrations safely.

| Product ID | Description |
|------------|-------------|
| `demo_iphone_15_pro` | Sample refurbished iPhone listing |
| `demo_galaxy_s24` | Sample refurbished Galaxy listing |

## Try it

```bash
curl -s https://pricewatcha.com/api/v1/products/demo_iphone_15_pro
curl -s https://pricewatcha.com/api/v1/products/demo_iphone_15_pro/price-history
curl -s "https://pricewatcha.com/api/v1/search?q=iphone+15"
```

Search also returns live catalog products (not only demo IDs). Demo responses include `"preview": true` where applicable.

## Note

Demo URLs are illustrative placeholders. They are not live merchant offers.
