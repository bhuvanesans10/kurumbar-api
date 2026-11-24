# syntax=docker/dockerfile:1.7-labs

########## BUILD STAGE ##########
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

# Copy lock + manifest early for caching
COPY pnpm-lock.yaml package.json ./

# Warm pnpm store
RUN --mount=type=cache,target=/root/.pnpm-store pnpm fetch

# Copy source
COPY . .

# Install exact deps
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile

# Placeholder DB URL for Prisma client generation
ARG POSTGRES_PRIMARY_DB_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV POSTGRES_PRIMARY_DB_URL=$POSTGRES_PRIMARY_DB_URL

# Generate Prisma client & compile
RUN --mount=type=cache,target=/root/.cache pnpm exec prisma generate
RUN pnpm run build:deploy

########## PROD DEPS STAGE ##########
FROM build AS prod-deps
RUN pnpm prune --prod

########## RUNTIME STAGE ##########
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

# Copy runtime artifacts
COPY --chown=nodeuser:nodeuser --from=build /app/dist ./dist
COPY --chown=nodeuser:nodeuser --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser --from=build /app/package.json ./package.json
COPY --chown=nodeuser:nodeuser --from=build /app/prisma ./prisma
COPY --chown=nodeuser:nodeuser --from=build /app/prisma.config.ts ./prisma.config.ts

USER nodeuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3005/api/_health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

EXPOSE 3005

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","dist/main.js"]
