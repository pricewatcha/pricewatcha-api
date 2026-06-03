# Build context: repository root (pricewatcha-api/), not mcp-server/ alone.
# Railway: set Root Directory to repo root, or point dockerfilePath at mcp-server/Dockerfile.

FROM node:20-slim

WORKDIR /app

COPY sdks/typescript/package.json sdks/typescript/package-lock.json* ./sdks/typescript/
COPY sdks/typescript/ ./sdks/typescript/

COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
RUN cd mcp-server && npm ci

COPY mcp-server/ ./mcp-server/
RUN cd mcp-server && npm run build

WORKDIR /app/mcp-server

ENV NODE_ENV=production
ENV PRICEWATCHA_MCP_DEFAULT_WAIT_SECONDS=60

EXPOSE 3000

CMD ["node", "dist/http.js"]
