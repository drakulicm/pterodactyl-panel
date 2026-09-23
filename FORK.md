# Fork notes

This is a fork of [pterodactyl/panel](https://github.com/pterodactyl/panel) (branched from `v1.15.1`) that replaces the
frontend with React 19 + Vite + Tailwind v4 + [shadcn/ui on Base UI](https://ui.shadcn.com). The Laravel backend and
Wings are unchanged apart from additive API endpoints.

## Layout

| Path | What it is |
| --- | --- |
| `resources/app` | The new frontend. A self-contained pnpm package (own `package.json`, `vite.config.ts`), builds to `public/build`. |
| `resources/scripts` | The upstream React 16 / webpack frontend. Reference only, deleted at cutover. |
| `resources/views/templates/app.blade.php` | Wrapper that boots the new SPA (`@vite`), replacing `wrapper.blade.php`. |
| `config/ui.php` | The `APP_NEW_UI` / `APP_NEW_ADMIN` feature flags. |
| `config/query.php` | Which egg features get a player count, and how their game is queried. |
| `resources/app/CONVENTIONS.md` | How to write code in the new frontend. Read before contributing. |
| `resources/app/ADMIN_API.md` | Contract for the Application API endpoints added by this fork. |
| `resources/app/e2e` | Playwright specs that drive the built frontend against a running panel. |
| `CUTOVER.md` | The staged plan for turning the flags on and deleting the upstream frontend. |

Everything is additive so the fork stays rebasable onto upstream. Upstream files touched so far:
`routes/admin.php`, `routes/api-application.php`, `routes/api-client.php`,
`app/Http/Controllers/{Base/IndexController,Auth/LoginController}.php`,
`app/Transformers/Api/Application/{BaseTransformer,EggTransformer}.php`, `Dockerfile`, and
`tests/Integration/Api/Client/AccountControllerTest.php` (whitespace only, to satisfy `php-cs-fixer`).

## Player counts

Wings only reports container resource usage, so the player count on the dashboard and the console page comes from the
panel querying the game server itself. `GET /api/client/servers/{server}/players` opens a UDP socket to the server's
primary allocation and speaks Steam's A2S_INFO, caching the result (successes and failures alike) for `query.ttl`
seconds.

A server only gets a player count when its egg carries one of the features in `config/query.php`, which maps each
feature to the offset added to the allocation port to reach the query port. Valheim answers one port above its game
port, so its egg needs the `valheim_query` feature. That feature list is mirrored in
`resources/app/src/lib/playerCount.ts`, which is how the frontend decides whether to ask at all — add a game to one and
you must add it to the other.

This needs the panel to reach the node's query port. On a single-box install that is already true; a split deployment
needs the firewall opened for it, and without it every queryable server just reads `Unavailable`.

## Feature flags

| Variable | Default | Effect |
| --- | --- | --- |
| `APP_NEW_UI` | `false` | Serves the new client area and auth pages instead of the upstream ones. |
| `APP_NEW_ADMIN` | `false` | Serves the new admin SPA instead of the Blade/AdminLTE admin. |

Both can be flipped independently, and turning them off restores the upstream UI without a rebuild, which is the
rollback path until `resources/scripts` is deleted.

## Local development

Requires Docker Desktop, Node >= 22 and pnpm. No local PHP needed — the dev stack runs the upstream image with this
repo's `app/`, `config/`, `routes/`, `resources/views`, `resources/lang` and `public/build` bind-mounted, so PHP edits
are live immediately.

```bash
docker compose -f compose.dev.yml up -d     # panel on :8080, wings on :8081, sftp on :2022
cd resources/app && pnpm install
pnpm build                                  # or: pnpm dev  (Vite dev server on :5173)
```

The panel is at http://localhost:8080. Create an admin user with:

```bash
docker compose -f compose.dev.yml exec panel php artisan p:user:make
```

### The local Wings node

`compose.dev.yml` runs Wings with `network_mode: service:panel` so the panel reaches it at `localhost`. On Docker Desktop
every path Wings uses must resolve identically inside and outside the container, so they all live under `.dev/wings/`
(git-ignored), including `system.machine_id.directory` and `passwd.directory` — the defaults under `/run/wings` break
container creation. Wings rewrites its own `config.yml` on boot, so stop it before editing that file. Its Docker network
is pinned to `172.31.0.0/16` to avoid overlapping the compose network.

Game containers and the `pterodactyl_nw` network are created directly on the Docker daemon, outside the compose project,
so `docker compose down` will not remove them.

### Checks

```bash
cd resources/app
pnpm typecheck
pnpm test                   # vitest unit tests
pnpm build && pnpm test:e2e # Playwright, against the stack above — see resources/app/e2e/README.md
```

The PHP suite needs a database whose name contains `test`; `bootstrap/tests.php` refuses to run
against anything else and rebuilds the schema before every run. Against the dev stack:

```bash
docker compose -f compose.dev.yml exec -T database mariadb -uroot -pdev_root -e 'CREATE DATABASE IF NOT EXISTS testing'
docker run --rm --network pterodactyl-dev_default -v "$PWD:/app" -w /app \
    -e APP_ENV=testing -e APP_KEY=SomeRandomString3232RandomString -e HASHIDS_SALT=test123 \
    -e DB_HOST=database -e DB_DATABASE=testing -e DB_USERNAME=root -e DB_PASSWORD=dev_root \
    -e CACHE_DRIVER=array -e SESSION_DRIVER=array -e QUEUE_DRIVER=sync \
    --entrypoint php ghcr.io/pterodactyl/panel:v1.15.1 vendor/bin/phpunit tests/Integration
```

Swap `vendor/bin/phpunit` for `vendor/bin/php-cs-fixer fix` to apply the code style the CI checks.
`tests/Unit/Console/Commands/Environment/Addons/RunHooksCommandTest` fails when run this way because
the executable bit does not survive the bind mount from macOS; it passes in CI.

## Building and deploying

The `Dockerfile` builds both frontends: stage 0 runs the legacy yarn/webpack build into `public/assets`, stage 1 runs
`pnpm build` into `public/build`, and both are copied into the final image. That means one image can serve either UI
depending on the flags.

`.github/workflows/ci-fork.yaml` runs the checks above on pushes and pull requests to `main` /
`feat/new-ui`. Upstream's `ci.yaml` only fires on pull requests to `1.0-develop`, so it never sees
this fork's branches.

`.github/workflows/docker-fork.yaml` builds and pushes `ghcr.io/<owner>/<repo>` on pushes to `main` / `feat/new-ui` and
on `fork-v*` tags.

See `CUTOVER.md` for the staged plan for enabling the flags in production and eventually deleting
`resources/scripts`. To deploy, point the panel service at the fork's image and set the flags. The container needs a persistent volume at
`/app/var`, which is where the entrypoint stores the generated `APP_KEY`; without it the panel returns 500s. No database
migrations are introduced by this fork, so rolling back is just changing the image tag.

## Staying current with upstream

```bash
git fetch upstream
git rebase upstream/1.0-develop
```

Conflicts are limited to the files listed under [Layout](#layout).
