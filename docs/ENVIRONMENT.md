# Local environment

## Requirements

- Node.js 20.19 or newer.
- pnpm 10. `corepack enable` can expose the repository-pinned pnpm version where Corepack is installed; on Windows, `pnpm.cmd` may be available from the npm global directory.
- Docker Desktop for local PostgreSQL and Redis.

## Registry and mirror notes

The project has no npm registry override. ArvanCloud's publicly documented mirrors cover Docker Hub and Linux distribution packages; no compatible Arvan npm registry endpoint was found. Do not configure an invented Arvan npm URL. The successful dependency install used the normal npm registry and is pinned by `pnpm-lock.yaml` integrity hashes.

To route Docker Hub image pulls through ArvanCloud, add this key to Docker Desktop's **Settings → Docker Engine** JSON and apply the change. Arvan's endpoint is `https://docker.arvancloud.ir` ([mirror directory](https://github.com/MiravaOrg/Mirava)); Docker documents the `registry-mirrors` engine setting ([Docker documentation](https://docs.docker.com/docker-hub/image-library/mirror)):

```json
"registry-mirrors": ["https://docker.arvancloud.ir"]
```

Merge it into the existing JSON object rather than replacing other Docker settings. Docker's `registry-mirrors` option only applies to Docker Hub; it does not change npm or non-Hub registries. If Docker Desktop cannot start or apply the setting, resolve that locally before running Compose.

## Start local dependencies

Copy `.env.example` to `.env`, then run:

```powershell
docker compose up -d
pnpm install --frozen-lockfile
pnpm dev
```

PostgreSQL and Redis ports are bound to localhost only. The example database password is for local development and must never be reused in a deployed environment.
