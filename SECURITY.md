# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `v1` | Yes |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security-sensitive reports.

Email: **security@pricewatcha.com** (or support@pricewatcha.com if the security alias is not yet active).

Include:

- Description of the issue
- Steps to reproduce
- Impact assessment (if known)
- Your contact for follow-up

We aim to acknowledge reports within a few business days.

## Scope

This repository contains the **public OpenAPI spec**, **official SDKs** (TypeScript and Python), the **MCP server** source (Streamable HTTP at `https://mcp.pricewatcha.com`), and **developer documentation**. The production REST API runs at `https://pricewatcha.com/api/v1`. Report issues in any of these components through the channel above; fixes to live services may ship from this repo (MCP, SDKs) or from the main application deployment separately.

## Out of scope

- Rate limit bypass attempts on production without authorization
- Scraping third-party merchant sites outside the documented API
- Social engineering
