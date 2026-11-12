# Build context is the repository root (see docker-compose.yml).
ARG NODE_IMAGE=docker.arvancloud.ir/node:22-bookworm-slim
FROM ${NODE_IMAGE}
ARG NPM_REGISTRY=https://registry.npmjs.org

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.34.9 --registry=${NPM_REGISTRY}

WORKDIR /repo
COPY . .
# Placeholder URLs only so `prisma generate` can run during install; real values come at runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile --filter @megap/api... \
  && pnpm --filter @megap/api build

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["sh", "/repo/infrastructure/docker/api-entrypoint.sh"]
