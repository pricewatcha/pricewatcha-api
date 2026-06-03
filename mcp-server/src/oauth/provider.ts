import { randomUUID } from "node:crypto";
import type { Response, Request } from "express";
import type { Pool } from "pg";

import type { OAuthClientInformationFull, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { checkResourceAllowed } from "@modelcontextprotocol/sdk/shared/auth-utils.js";

import { getMcpResourceUrlFromRequest } from "../utils/public-origin.js";

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

type PendingAuthorization = {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
};

type AccessTokenRecord = {
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
};

type RefreshTokenRecord = {
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
};

type ClientRow = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[] | null;
  response_types: string[] | null;
  token_endpoint_auth_method: string;
  client_id_issued_at: string | number | null;
};

type AuthorizationCodeRow = {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string | null;
  resource: string | null;
  expires_at: Date;
  used: boolean;
};

type TokenRow = {
  access_token: string;
  refresh_token: string | null;
  client_id: string;
  scope: string | null;
  resource: string | null;
  expires_at: Date;
  refresh_expires_at: Date | null;
};

export class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>();

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): OAuthClientInformationFull {
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    this.clients.set(registered.client_id, registered);
    return registered;
  }
}

function mapClientRow(row: ClientRow): OAuthClientInformationFull {
  const mapped: OAuthClientInformationFull = {
    client_id: row.client_id,
    redirect_uris: row.redirect_uris,
    grant_types: row.grant_types ?? [],
    response_types: row.response_types ?? [],
    token_endpoint_auth_method: row.token_endpoint_auth_method,
    client_id_issued_at: Number(row.client_id_issued_at ?? 0),
  };
  if (row.client_name) {
    mapped.client_name = row.client_name;
  }
  return mapped;
}

export class DbClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly pool: Pool) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const result = await this.pool.query<ClientRow>(
      `SELECT client_id, client_name, redirect_uris, grant_types, response_types,
              token_endpoint_auth_method, client_id_issued_at
       FROM oauth_clients
       WHERE client_id = $1`,
      [clientId],
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    return mapClientRow(result.rows[0]!);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): Promise<OAuthClientInformationFull> {
    const clientId = randomUUID();
    const clientIdIssuedAt = Math.floor(Date.now() / 1000);
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: clientIdIssuedAt,
    };

    await this.pool.query(
      `INSERT INTO oauth_clients (
         client_id, client_name, redirect_uris, grant_types, response_types,
         token_endpoint_auth_method, client_id_issued_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id) DO NOTHING`,
      [
        clientId,
        client.client_name ?? null,
        client.redirect_uris,
        client.grant_types ?? [],
        client.response_types ?? [],
        client.token_endpoint_auth_method ?? "none",
        clientIdIssuedAt,
      ],
    );

    return registered;
  }
}

/**
 * In-memory OAuth authorization server for MCP (tests / local dev without DB).
 */
export class InMemoryOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new InMemoryClientsStore();

  private readonly codes = new Map<string, PendingAuthorization>();
  private readonly accessTokens = new Map<string, AccessTokenRecord>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  constructor(private readonly strictResource: boolean) {}

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    if (this.strictResource && params.resource) {
      const expected = getMcpResourceUrlFromRequest(res.req as Request);
      if (!expected) {
        throw new InvalidRequestError("Resource URL not configured");
      }
      if (
        !checkResourceAllowed({
          requestedResource: params.resource,
          configuredResource: expected,
        })
      ) {
        throw new InvalidRequestError("Invalid resource parameter");
      }
    }

    const code = randomUUID();
    this.codes.set(code, { client, params });

    const target = new URL(params.redirectUri);
    target.searchParams.set("code", code);
    if (params.state !== undefined) {
      target.searchParams.set("state", params.state);
    }
    res.redirect(target.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const pending = this.codes.get(authorizationCode);
    if (!pending) {
      throw new InvalidRequestError("Invalid authorization code");
    }
    return pending.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const pending = this.codes.get(authorizationCode);
    if (!pending) {
      throw new InvalidRequestError("Invalid authorization code");
    }
    if (pending.client.client_id !== client.client_id) {
      throw new InvalidRequestError("Authorization code was not issued to this client");
    }

    this.codes.delete(authorizationCode);
    return this.issueTokens(
      client.client_id,
      pending.params.scopes ?? [],
      pending.params.resource,
      pending.params.scopes?.includes("offline_access") ?? false,
    );
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const stored = this.refreshTokens.get(refreshToken);
    if (!stored || stored.clientId !== client.client_id || stored.expiresAt < Date.now()) {
      throw new InvalidRequestError("Invalid refresh token");
    }

    this.refreshTokens.delete(refreshToken);
    return this.issueTokens(
      client.client_id,
      scopes ?? stored.scopes,
      resource ?? stored.resource,
      true,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = this.accessTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new InvalidRequestError("Invalid or expired token");
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      resource: record.resource,
    };
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: { token: string; token_type_hint?: string },
  ): Promise<void> {
    const hint = request.token_type_hint;
    if (hint === "refresh_token" || this.refreshTokens.has(request.token)) {
      const stored = this.refreshTokens.get(request.token);
      if (stored?.clientId === client.client_id) {
        this.refreshTokens.delete(request.token);
      }
      return;
    }

    const stored = this.accessTokens.get(request.token);
    if (stored?.clientId === client.client_id) {
      this.accessTokens.delete(request.token);
    }
  }

  private issueTokens(
    clientId: string,
    scopes: string[],
    resource: URL | undefined,
    includeRefresh: boolean,
  ): OAuthTokens {
    const accessToken = randomUUID();
    const expiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;

    this.accessTokens.set(accessToken, {
      clientId,
      scopes,
      expiresAt,
      resource,
    });

    const result: OAuthTokens = {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: scopes.join(" "),
    };

    if (includeRefresh) {
      const refreshToken = randomUUID();
      this.refreshTokens.set(refreshToken, {
        clientId,
        scopes,
        expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
        resource,
      });
      result.refresh_token = refreshToken;
    }

    return result;
  }
}

export class DbOAuthProvider implements OAuthServerProvider {
  readonly clientsStore: DbClientsStore;

  constructor(
    private readonly pool: Pool,
    private readonly strictResource: boolean,
  ) {
    this.clientsStore = new DbClientsStore(pool);
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    if (this.strictResource && params.resource) {
      const expected = getMcpResourceUrlFromRequest(res.req as Request);
      if (!expected) {
        throw new InvalidRequestError("Resource URL not configured");
      }
      if (
        !checkResourceAllowed({
          requestedResource: params.resource,
          configuredResource: expected,
        })
      ) {
        throw new InvalidRequestError("Invalid resource parameter");
      }
    }

    const code = randomUUID();
    const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

    await this.pool.query(
      `INSERT INTO oauth_authorization_codes (
         code, client_id, redirect_uri, code_challenge, code_challenge_method,
         scope, resource, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        code,
        client.client_id,
        params.redirectUri,
        params.codeChallenge,
        "S256",
        params.scopes?.join(" ") ?? null,
        params.resource?.href ?? null,
        expiresAt,
      ],
    );

    const target = new URL(params.redirectUri);
    target.searchParams.set("code", code);
    if (params.state !== undefined) {
      target.searchParams.set("state", params.state);
    }
    res.redirect(target.toString());
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const result = await this.pool.query<Pick<AuthorizationCodeRow, "code_challenge" | "client_id" | "expires_at" | "used">>(
      `SELECT code_challenge, client_id, expires_at, used
       FROM oauth_authorization_codes
       WHERE code = $1`,
      [authorizationCode],
    );

    if (result.rowCount === 0) {
      throw new InvalidRequestError("Invalid authorization code");
    }

    const row = result.rows[0]!;
    if (row.used || row.expires_at.getTime() < Date.now()) {
      throw new InvalidRequestError("Invalid authorization code");
    }
    if (row.client_id !== client.client_id) {
      throw new InvalidRequestError("Authorization code was not issued to this client");
    }

    return row.code_challenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const result = await this.pool.query<AuthorizationCodeRow>(
      `SELECT code, client_id, redirect_uri, code_challenge, code_challenge_method,
              scope, resource, expires_at, used
       FROM oauth_authorization_codes
       WHERE code = $1 AND used = FALSE AND expires_at > NOW()`,
      [authorizationCode],
    );

    if (result.rowCount === 0) {
      throw new InvalidRequestError("Invalid authorization code");
    }

    const row = result.rows[0]!;
    if (row.client_id !== client.client_id) {
      throw new InvalidRequestError("Authorization code was not issued to this client");
    }

    await this.pool.query(
      `UPDATE oauth_authorization_codes SET used = TRUE WHERE code = $1`,
      [authorizationCode],
    );

    const scopes = row.scope?.split(" ").filter(Boolean) ?? [];
    const resource = row.resource ? new URL(row.resource) : undefined;
    return this.issueTokens(
      client.client_id,
      scopes,
      resource,
      scopes.includes("offline_access"),
    );
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const result = await this.pool.query<TokenRow>(
      `SELECT access_token, refresh_token, client_id, scope, resource,
              expires_at, refresh_expires_at
       FROM oauth_tokens
       WHERE refresh_token = $1`,
      [refreshToken],
    );

    if (result.rowCount === 0) {
      throw new InvalidRequestError("Invalid refresh token");
    }

    const row = result.rows[0]!;
    if (
      row.client_id !== client.client_id ||
      !row.refresh_expires_at ||
      row.refresh_expires_at.getTime() < Date.now()
    ) {
      throw new InvalidRequestError("Invalid refresh token");
    }

    await this.pool.query(`DELETE FROM oauth_tokens WHERE refresh_token = $1`, [refreshToken]);

    const storedScopes = row.scope?.split(" ").filter(Boolean) ?? [];
    const storedResource = row.resource ? new URL(row.resource) : undefined;
    return this.issueTokens(
      client.client_id,
      scopes ?? storedScopes,
      resource ?? storedResource,
      true,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const result = await this.pool.query<TokenRow>(
      `SELECT access_token, refresh_token, client_id, scope, resource,
              expires_at, refresh_expires_at
       FROM oauth_tokens
       WHERE access_token = $1 AND expires_at > NOW()`,
      [token],
    );

    if (result.rowCount === 0) {
      throw new InvalidRequestError("Invalid or expired token");
    }

    const row = result.rows[0]!;
    return {
      token,
      clientId: row.client_id,
      scopes: row.scope?.split(" ").filter(Boolean) ?? [],
      expiresAt: Math.floor(row.expires_at.getTime() / 1000),
      resource: row.resource ? new URL(row.resource) : undefined,
    };
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: { token: string; token_type_hint?: string },
  ): Promise<void> {
    const hint = request.token_type_hint;

    if (hint === "refresh_token") {
      await this.pool.query(
        `DELETE FROM oauth_tokens WHERE refresh_token = $1 AND client_id = $2`,
        [request.token, client.client_id],
      );
      return;
    }

    if (hint === "access_token") {
      await this.pool.query(
        `DELETE FROM oauth_tokens WHERE access_token = $1 AND client_id = $2`,
        [request.token, client.client_id],
      );
      return;
    }

    const refreshResult = await this.pool.query(
      `DELETE FROM oauth_tokens WHERE refresh_token = $1 AND client_id = $2`,
      [request.token, client.client_id],
    );
    if ((refreshResult.rowCount ?? 0) > 0) {
      return;
    }

    await this.pool.query(
      `DELETE FROM oauth_tokens WHERE access_token = $1 AND client_id = $2`,
      [request.token, client.client_id],
    );
  }

  private async issueTokens(
    clientId: string,
    scopes: string[],
    resource: URL | undefined,
    includeRefresh: boolean,
  ): Promise<OAuthTokens> {
    const accessToken = randomUUID();
    const refreshToken = includeRefresh ? randomUUID() : undefined;
    const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
    const refreshExpiresAt = includeRefresh
      ? new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
      : null;

    await this.pool.query(
      `INSERT INTO oauth_tokens (
         access_token, refresh_token, client_id, scope, resource,
         expires_at, refresh_expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        accessToken,
        refreshToken ?? null,
        clientId,
        scopes.join(" ") || null,
        resource?.href ?? null,
        accessExpiresAt,
        refreshExpiresAt,
      ],
    );

    const result: OAuthTokens = {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: scopes.join(" "),
    };

    if (refreshToken) {
      result.refresh_token = refreshToken;
    }

    return result;
  }
}

export function createOAuthProvider(
  strictResource: boolean,
  pool?: Pool,
): DbOAuthProvider | InMemoryOAuthProvider {
  if (pool) {
    return new DbOAuthProvider(pool, strictResource);
  }
  return new InMemoryOAuthProvider(strictResource);
}
