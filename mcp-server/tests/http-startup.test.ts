import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HTTP_ENTRY = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/http.js",
);

function runHttp(
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HTTP_ENTRY], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      output += text;
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      output += text;
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, output });
    });
  });
}

describe("HTTP startup", () => {
  it("exits in production when PRICEWATCHA_API_BASE_URL is missing", async () => {
    const result = await runHttp(
      {
        NODE_ENV: "production",
        PORT: "18080",
      },
      3000,
    );
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /PRICEWATCHA_API_BASE_URL is required/);
    assert.doesNotMatch(result.stdout, /listening on \[/);
  });

  it("listens on 0.0.0.0 when production env is satisfied", async () => {
    const result = await runHttp(
      {
        NODE_ENV: "production",
        PORT: "18081",
        PRICEWATCHA_API_BASE_URL: "https://pricewatcha.com/api/v1",
      },
      4000,
    );
    assert.match(result.stdout, /listening on \[::\]:18081/);
  });

  it("continues startup when OAuth DB initialization fails", async () => {
    const result = await runHttp(
      {
        NODE_ENV: "production",
        PORT: "18082",
        PRICEWATCHA_API_BASE_URL: "https://pricewatcha.com/api/v1",
        SUPABASE_DB_URL: "postgresql://invalid:invalid@127.0.0.1:9/nodb",
      },
      8000,
    );
    assert.match(result.stderr, /OAuth DB initialization failed/);
    assert.match(result.stdout, /listening on \[::\]:18082/);
  });

  it("initializes OAuth DB before listening when MCP OAuth is enabled", async () => {
    const result = await runHttp(
      {
        NODE_ENV: "production",
        PORT: "18083",
        PRICEWATCHA_API_BASE_URL: "https://pricewatcha.com/api/v1",
        MCP_OAUTH_ENABLED: "true",
        PRICEWATCHA_MCP_ISSUER_URL: "https://mcp.pricewatcha.com",
        SUPABASE_DB_URL: "postgresql://invalid:invalid@127.0.0.1:9/nodb",
      },
      8000,
    );
    const output = result.output;
    const dbFailedAt = output.indexOf("OAuth DB initialization failed");
    const listeningAt = output.indexOf("listening on [::]:18083");
    assert.ok(dbFailedAt >= 0, "expected OAuth DB init failure log");
    assert.ok(listeningAt >= 0, "expected server to listen");
    assert.ok(dbFailedAt < listeningAt, "OAuth DB init must complete before listen");
  });
});
