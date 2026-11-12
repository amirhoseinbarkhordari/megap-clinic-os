# Build context is the repository root (see docker-compose.yml).
ARG NODE_IMAGE=docker.arvancloud.ir/node:22-bookworm-slim
FROM ${NODE_IMAGE}
ARG NPM_REGISTRY=https://registry.npmjs.org
# Inlined into the browser bundle at build time; must be reachable from the user's browser.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

RUN npm install -g pnpm@10.34.9 --registry=${NPM_REGISTRY}

WORKDIR /repo
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile --filter @megap/web... \
  && pnpm --filter @megap/web build

WORKDIR /repo/apps/web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
