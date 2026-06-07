/** Routes that must stay reachable without Host/Origin guards (probes, favicons, crawlers, etc.). */
export const PUBLIC_UNGUARDED_PATHS = new Set([
  "/health",
  "/robots.txt",
  "/favicon.ico",
  "/favicon-64.png",
]);

export function isPublicUnguardedPath(path: string, method: string): boolean {
  if (method === "GET" && path === "/") {
    return true;
  }
  return PUBLIC_UNGUARDED_PATHS.has(path);
}
