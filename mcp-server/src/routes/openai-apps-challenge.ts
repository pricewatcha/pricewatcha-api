import type { Express, Request, Response } from "express";

/** Token served for OpenAI ChatGPT app domain verification during submission. */
export const OPENAI_APPS_CHALLENGE_TOKEN =
  "_O8Jmcbx_xvjayv5AqssnIcMWjr2QOAmKeg-TJAnXiU";

export function mountOpenAiAppsChallengeRoute(app: Express): void {
  app.get("/.well-known/openai-apps-challenge", (_req: Request, res: Response) => {
    res.type("text/plain").send(OPENAI_APPS_CHALLENGE_TOKEN);
  });
}
