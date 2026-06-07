/** Routes that must stay reachable without Host/Origin guards (probes, favicons, etc.). */
export const PUBLIC_UNGUARDED_PATHS = new Set([
  "/health",
  "/favicon.ico",
  "/favicon-64.png",
]);

export function isPublicUnguardedPath(path: string): boolean {
  return PUBLIC_UNGUARDED_PATHS.has(path);
}
