# syntax=docker/dockerfile:1.7
# Build context: repository root  →  docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /repo
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# ─── Dependencies (cached until a manifest or the lockfile changes) ───────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @portfolio/contracts --workspace apps/api --include-workspace-root --ignore-scripts

# ─── Build: shared contracts, Prisma client, API ──────────────────────────────
FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @portfolio/contracts \
 && cd apps/api && npx prisma generate && npx nest build

# ─── Runtime (production dependencies only, non-root) ─────────────────────────
FROM base AS runtime
ENV NODE_ENV=production PORT=3333 UPLOAD_DIR=/repo/apps/api/uploads
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @portfolio/contracts --workspace apps/api --omit=dev --ignore-scripts
COPY --from=build /repo/packages/contracts/dist packages/contracts/dist
COPY apps/api/prisma apps/api/prisma
RUN cd apps/api && npx prisma generate
COPY --from=build /repo/apps/api/dist apps/api/dist
RUN mkdir -p apps/api/uploads && chown -R node:node apps/api/uploads

USER node
WORKDIR /repo/apps/api
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1

# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
