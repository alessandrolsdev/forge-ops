FROM node:22-bookworm-slim AS workspace-base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @forgeops/core build \
  && pnpm --filter @forgeops/backend prisma:generate

FROM workspace-base AS frontend-dev

WORKDIR /workspace/frontend

CMD ["node", "../scripts/start-frontend-dev.mjs"]

FROM workspace-base AS backend-dev

WORKDIR /workspace/backend

CMD ["sh", "-lc", "pnpm --filter @forgeops/core build && pnpm --filter @forgeops/backend prisma:generate && node ../scripts/run-bin.mjs tsx watch src/server.ts"]
