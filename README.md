# Kurumbar API

NestJS 11 + Fastify 5 + Prisma 7 backend API following the Genie `fleet-gateway` core architecture.

## Setup

1. Copy environment variables template:
   ```bash
   cp .env.template .env
   ```
   Minimum local `DEV` values required for startup:
   - `CORS_ENV=DEV`
   - `IS_SWAGGER=true`
   - `COOKIE_SIGN_SECRET=<random-secret>`
   - `POSTGRES_PRIMARY_DB_URL=postgresql://...`
   - `POSTGRES_READ_REPLICA_DB_URL=postgresql://...`

2. Install dependencies & generate Prisma client:
   ```bash
   pnpm install
   pnpm exec prisma generate
   ```

3. Build & run:
   ```bash
   pnpm run build
   pnpm run start:watch
   ```

4. Run unit tests:
   ```bash
   pnpm test -- src/common/logger
   pnpm test -- src/filters
   pnpm test -- src/health
   pnpm test -- src/global-exceptions
   pnpm test -- src/util
   ```
