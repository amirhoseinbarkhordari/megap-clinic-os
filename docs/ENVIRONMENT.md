# Local environment

## Requirements

- Node.js 20.19 or newer.
- pnpm 10 (the repository pins its version in `package.json`).
- Docker Desktop for local PostgreSQL and Redis.

## Registries and mirrors

The local Compose services use ArvanCloud's Docker Hub mirror directly: `docker.arvancloud.ir/postgres` and `docker.arvancloud.ir/redis`. The Node packages use npm; no Arvan npm registry URL is configured. Package versions and integrity hashes are pinned in `pnpm-lock.yaml`.

If you also want Docker Desktop to route other Docker Hub image pulls through ArvanCloud, add this key to the existing **Settings > Docker Engine** JSON and apply it ([Docker registry mirror documentation](https://docs.docker.com/docker-hub/image-library/mirror)):

```json
"registry-mirrors": ["https://docker.arvancloud.ir"]
```

Merge the key into the existing JSON object. Docker's `registry-mirrors` applies to Docker Hub and does not change npm or other registries.

## Start local dependencies

Copy `.env.example` to `.env`, set `JWT_ACCESS_SECRET` to a random secret of at least 32 characters, then run:

```powershell
docker compose up -d
pnpm install --frozen-lockfile
pnpm --filter @megap/api db:deploy
pnpm dev
```

PostgreSQL and Redis bind to localhost. The example database password is for local development only. The initial migration forces RLS on tenant-owned tables; API access to those tables must use an authenticated tenant principal and `withTenantTransaction`.
