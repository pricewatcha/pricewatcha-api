import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Express, Request, Response } from "express";

const PACKAGE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC_DIR = path.join(PACKAGE_ROOT, "public");

type FaviconAsset = {
  fileName: string;
  contentType: string;
  cacheControl: string;
};

const FAVICON_ASSETS: Record<string, FaviconAsset> = {
  "/favicon.ico": {
    fileName: "favicon.ico",
    contentType: "image/x-icon",
    cacheControl: "public, max-age=86400",
  },
  "/favicon-64.png": {
    fileName: "favicon-64.png",
    contentType: "image/png",
    cacheControl: "public, max-age=86400",
  },
  "/logo.svg": {
    fileName: "pricewatcha-binoculars.svg",
    contentType: "image/svg+xml",
    cacheControl: "public, max-age=86400",
  },
};

function loadAsset(fileName: string): Buffer {
  return readFileSync(path.join(PUBLIC_DIR, fileName));
}

export function mountFaviconRoutes(app: Express): void {
  const cache = new Map<string, Buffer>();

  for (const [route, asset] of Object.entries(FAVICON_ASSETS)) {
    app.get(route, (_req: Request, res: Response) => {
      let body = cache.get(asset.fileName);
      if (!body) {
        body = loadAsset(asset.fileName);
        cache.set(asset.fileName, body);
      }
      res.setHeader("Content-Type", asset.contentType);
      res.setHeader("Cache-Control", asset.cacheControl);
      res.status(200).send(body);
    });
  }
}
