# syntax=docker/dockerfile:1.7
# Build context: repository root  →  docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS base
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @portfolio/contracts --workspace apps/web --include-workspace-root --ignore-scripts

# ─── Build (standalone output) ────────────────────────────────────────────────
FROM deps AS build
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Server-side URL used while pre-rendering. If the API is offline, pages render their
# empty states and fill in on the next revalidation.
ARG API_URL=http://api:3333/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    API_URL=$API_URL \
    BUILD_STANDALONE=1
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build -w @portfolio/contracts && npm run build -w apps/web

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/en" >/dev/null || exit 1

CMD ["node", "apps/web/server.js"]
