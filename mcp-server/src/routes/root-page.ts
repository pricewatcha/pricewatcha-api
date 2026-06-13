import type { Express, Request, Response } from "express";

const ROOT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pricewatcha MCP</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png">
</head>
<body>
  <p>Pricewatcha MCP server — use POST for MCP requests.</p>
  <p>
    <a href="https://pricewatcha.com">Pricewatcha</a> ·
    <a href="https://pricewatcha.com/en/developers">Developer docs</a> ·
    <a href="https://pricewatcha.com/en/pricewatcha-in-claude-and-chatgpt">MCP setup guide</a>
  </p>
</body>
</html>`;

const ROBOTS_TXT = "User-agent: *\nAllow: /\n";

export function mountRootPageRoutes(app: Express): void {
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).type("html").send(ROOT_HTML);
  });

  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.status(200).type("text/plain").send(ROBOTS_TXT);
  });
}
