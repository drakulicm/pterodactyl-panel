# Admin Application API additions

New endpoints under `/api/application` for the admin SPA. Everything here was exercised with curl against the dev stack
(`http://localhost:8080`) using a session cookie, unless marked **not verified**. Pre-existing endpoints (users, nodes,
locations, servers, nests/eggs read) are unchanged and documented upstream.

## Conventions

**Authentication.** Log in as usual (`GET /sanctum/csrf-cookie`, `POST /auth/login`); then send the session cookie plus
`X-XSRF-TOKEN: <url-decoded XSRF-TOKEN cookie>`, `X-Requested-With: XMLHttpRequest`, `Accept: application/json`. The user
must be `root_admin`.

**Auth class** (listed per endpoint):

| Class | Session (root admin) | `ptla_` application key |
|---|---|---|
| `session-only` | allowed | always `403` |
| `ACL <resource> R` / `RW` | allowed | needs `r_<resource>` read (1) / read-write (3) on the key |

**Response envelope** (Fractal): item `{"object": "<name>", "attributes": {...}}`, list
`{"object": "list", "data": [item, ...], "meta": {"pagination": {...}}}` (pagination only where stated). Creates return
`201` (with `meta.resource` URL where a view route exists), deletes return `204` with an empty body.

**Includes.** `?include=a,b` adds `attributes.relationships.<name>`. Session requests can now load every include
(before this work they always came back as `null_resource`). For API keys an include the key has no permission for is
`{"object": "null_resource", "attributes": null}`.

**List queries.** `?per_page=50&page=1`, `?filter[field]=value`, `?sort=field` / `?sort=-field` on the fields stated.

**Errors.**

```json
{"errors": [{"code": "ValidationException", "status": "422", "detail": "The host field is required.",
             "meta": {"source_field": "host", "rule": "required"}}]}
```

`422` validation (one entry per failed rule), `400` `DisplayException` and other business-rule failures (`detail` is
user-presentable), `403` `AccessDeniedHttpException`, `404` `NotFoundHttpException`. With `APP_DEBUG=true` errors also carry
`source` and `meta.trace`; ignore them.

**PATCH is full-object everywhere.** Like the Blade forms these endpoints mirror, PATCH bodies are validated with the
same required fields as the create call. Always send the whole object, not a diff.

**Scoped bindings.** Nested ids are scoped to their parent (`/nests/5/eggs/1` is `404` if egg 1 is not in nest 5; same
for egg variables, node allocations, mount eggs/nodes and server mounts).

---

## Version

### `GET /version` — session-only

```json
{"panel": {"current": "canary", "latest": "1.15.1", "is_latest": true},
 "wings": {"latest": "1.13.3"},
 "links": {"discord": "https://discord.gg/pterodactyl", "donations": "https://github.com/sponsors/pterodactyl"}}
```

`latest` values are `"error"` when the CDN could not be reached. The running Wings version of a node comes from
`GET /nodes/{id}/system-information`.

---

## Database hosts — ACL `database_hosts`

| Method | Path | Auth |
|---|---|---|
| GET | `/database-hosts` | R |
| GET | `/database-hosts/{id}` | R |
| POST | `/database-hosts` | RW |
| PATCH | `/database-hosts/{id}` | RW |
| DELETE | `/database-hosts/{id}` | RW |

List: paginated; filters `name`, `host`; sorts `id`, `name`, `host`. Include: `databases` (server databases on the host).

Body (POST and PATCH):

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 191 |
| `host` | string | required, `^[\w\-\.]+$` |
| `port` | int | required, 1-65535 |
| `username` | string | required, max 32 |
| `password` | string | nullable. On PATCH omit/empty to keep the stored password |
| `node_id` | int\|null | optional, must exist; omitted/null unlinks the node |

The panel connects to the host with the given credentials before saving; a failure is a `400`:
`There was an error while trying to connect to the host or while executing a query: "SQLSTATE[HY000] [1045] Access denied ..."`.
Delete is refused with `400` while databases exist on the host. The password is never returned.

```json
{"object": "database_host",
 "attributes": {"id": 2, "name": "Dev DB", "host": "database", "port": 3306, "username": "root", "node": null,
                "created_at": "2026-09-18T15:35:04+00:00", "updated_at": "2026-09-18T15:35:04+00:00"},
 "meta": {"resource": "http://localhost:8080/api/application/database-hosts/2"}}
```

---

## Mounts — session-only

| Method | Path | Notes |
|---|---|---|
| GET | `/mounts` | paginated; filters `uuid`, `name`, `source`, `target`; sorts `id`, `name` |
| GET | `/mounts/{id}` | use `?include=eggs,nodes,servers` |
| POST | `/mounts` | 201 |
| PATCH | `/mounts/{id}` | full object |
| DELETE | `/mounts/{id}` | `400` while attached to any server; detaches eggs/nodes |
| POST | `/mounts/{id}/eggs` | body `{"eggs": [3, 4]}` (required array, ids must exist); idempotent; returns the mount |
| POST | `/mounts/{id}/nodes` | body `{"nodes": [1]}`; idempotent; returns the mount |
| DELETE | `/mounts/{id}/eggs/{eggId}` | 204; `404` if that egg is not attached |
| DELETE | `/mounts/{id}/nodes/{nodeId}` | 204; `404` if that node is not attached |

Body (POST/PATCH):

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, 2-64, unique |
| `description` | string\|null | max 191 |
| `source` | string | required; not `/etc/pterodactyl`, `/var/lib/pterodactyl/volumes`, `/srv/daemon-data` |
| `target` | string | required; not `/home/container` |
| `read_only` | bool | optional |
| `user_mountable` | bool | optional |

```json
{"object": "mount",
 "attributes": {"id": 1, "uuid": "223b3ea6-eefa-4bed-86b6-c406824d334a", "name": "Test Mount", "description": "d",
                "source": "/srv/shared", "target": "/mnt/x", "read_only": true, "user_mountable": false,
                "eggs_count": 2, "nodes_count": 1, "servers_count": 0}}
```

`*_count` fields are present on the `/mounts` endpoints, not on the per-server list below. Includes use the normal
`egg`, `node` and `server` transformers.

### Server mounts — session-only

| Method | Path | Notes |
|---|---|---|
| GET | `/servers/{id}/mounts` | mounts *available* to the server (mount has the server's egg **and** node) |
| POST | `/servers/{id}/mounts` | body `{"mount_id": 1}`; `400` if the mount is not available to this server; idempotent; returns the same list as GET |
| DELETE | `/servers/{id}/mounts/{mountId}` | 204; `404` if not currently mounted |

```json
{"object": "list", "data": [{"object": "mount", "attributes": {"id": 1, "uuid": "...", "name": "Test Mount", "...": "..."}}],
 "meta": {"mounted": [1]}}
```

`meta.mounted` holds the ids of the mounts currently attached to the server. Not paginated.

---

## Nests — ACL `nests` RW

| Method | Path | Notes |
|---|---|---|
| POST | `/nests` | 201, `nest` item |
| PATCH | `/nests/{id}` | returns the `nest` item |
| DELETE | `/nests/{id}` | 204; `400` if servers use the nest. Deletes the nest's eggs too |
| POST | `/nests/{id}/import` | auth: ACL `eggs` RW. Imports an egg, 201 `egg` item |

Body (POST/PATCH): `name` string required, 1-191, `^[\w\- ]+$`; `description` string|null (omitted = cleared). The author
is always the panel's `APP_SERVICE_AUTHOR`.

```json
{"object": "nest", "attributes": {"id": 5, "uuid": "2d910fad-...", "author": "dev@example.com", "name": "Throwaway Nest",
 "description": "tmp", "created_at": "2026-09-18T15:35:47+00:00", "updated_at": "2026-09-18T15:35:47+00:00"},
 "meta": {"resource": "http://localhost:8080/api/application/nests/5"}}
```

**Import** accepts any one of

- `multipart/form-data` with `import_file` (JSON file, max 1000 KB, mimetype `application/json` or `text/plain`),
- a JSON body `{"import_url": "https://..."}` (string, max 2048, `http`/`https` only), which the panel downloads
  itself, or
- `Content-Type: application/json` with the exported egg document itself as the body (must contain `meta.version`).

`import_url` is rewritten before the request is made, so a GitHub blob page
(`https://github.com/<owner>/<repo>/blob/<ref>/<path>`) or a Gist page
(`https://gist.github.com/<user>/<id>`) can be pasted as it appears in the browser and the raw file behind it is
fetched. Any other URL is requested verbatim. The download uses the panel's Guzzle timeouts
(`pterodactyl.guzzle.*`) and is capped at 1000 KB. A non-2xx response, a body that is not JSON, an oversized body or a
connection failure is a `400` `InvalidFileUploadException` naming the URL; the remote body is never echoed back. Note
that this makes the panel issue an outbound request to an operator-chosen address, which is the same trust level as the
node FQDN and database host fields.

An unrecognised document (`meta.version` not `PTDL_v1`/`PTDL_v2`) is a `400` `InvalidFileUploadException`.

## Eggs — ACL `eggs`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/nests/{nest}/eggs` | RW | 201 `egg` item |
| PATCH | `/nests/{nest}/eggs/{egg}` | RW | full object; `egg` item |
| DELETE | `/nests/{nest}/eggs/{egg}` | RW | 204; `400` if servers use it or other eggs extend its config |
| GET | `/nests/{nest}/eggs/{egg}/export` | R | JSON download (`Content-Disposition: attachment; filename=egg-<name>.json`), PTDL_v2 document, not the API envelope |
| PUT | `/nests/{nest}/eggs/{egg}/import` | RW | same body options as nest import; updates egg + upserts variables by `env_variable`; `egg` item |
| PATCH | `/nests/{nest}/eggs/{egg}/script` | RW | `egg` item |

> PHP does not parse `multipart/form-data` on PUT. To upload a **file** to `.../import` send `POST` with an extra form
> field `_method=PUT`. A JSON body works with a real `PUT`.

Egg body (POST/PATCH):

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 191 |
| `description` | string\|null | |
| `docker_images` | object `{label: image}` or array `[image]` | required, min 1; an array is stored as `{image: image}` |
| `startup` | string | required |
| `force_outgoing_ip` | bool | optional, default `false` |
| `features` | string[] | optional, default `[]` |
| `file_denylist` | string[] | optional. Stored on create; **ignored on update** (upstream service limitation) |
| `config_from` | int\|null | optional; egg id in the same nest to inherit config from (`0`/null = none); other nest → `400` |
| `config_stop` | string\|null | required unless `config_from`; max 191 |
| `config_startup`, `config_logs`, `config_files` | JSON object **or** JSON-encoded string | required unless `config_from` |

Script body (all fields are written on every call, send the whole set):

| Field | Type | Rules |
|---|---|---|
| `script_install` | string\|null | |
| `script_is_privileged` | bool | defaults to `true` when omitted |
| `script_entry` | string | e.g. `ash`, `bash` |
| `script_container` | string | e.g. `alpine:3.4` |
| `copy_script_from` | int\|null | egg in the same nest that does not itself copy a script, else `400` |

`egg` item (existing transformer; `features`, `force_outgoing_ip`, `update_url` are new fields):

```json
{"object": "egg", "attributes": {
  "id": 15, "uuid": "8c7533b2-...", "name": "Test Egg", "nest": 5, "author": "dev@example.com", "description": "x",
  "docker_image": "ghcr.io/pterodactyl/yolks:java_21",
  "docker_images": {"Java 21": "ghcr.io/pterodactyl/yolks:java_21"},
  "features": ["eula"], "force_outgoing_ip": true, "update_url": null,
  "config": {"files": {}, "startup": {"done": "Done"}, "stop": "stop", "logs": [], "file_denylist": null, "extends": null},
  "startup": "java -jar server.jar",
  "script": {"privileged": true, "install": null, "entry": "ash", "container": "alpine:3.4", "extends": null},
  "created_at": "...", "updated_at": "..."}}
```

Includes on the existing `GET /nests/{nest}/eggs[/{egg}]`: `nest`, `servers`, `variables`, `config`, `script`.

### Egg variables — ACL `eggs`

| Method | Path | Auth |
|---|---|---|
| GET | `/nests/{nest}/eggs/{egg}/variables` | R (not paginated) |
| POST | `/nests/{nest}/eggs/{egg}/variables` | RW, 201 |
| PATCH | `/nests/{nest}/eggs/{egg}/variables/{variable}` | RW, full object |
| DELETE | `/nests/{nest}/eggs/{egg}/variables/{variable}` | RW, 204 |

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, 1-191 |
| `description` | string\|null | optional (stored as `""`) |
| `env_variable` | string | required, `^\w{1,191}$`, not a reserved name (`SERVER_MEMORY`, `SERVER_IP`, `SERVER_PORT`, `ENV`, `HOME`, `USER`, `STARTUP`, `SERVER_UUID`, `UUID`); on PATCH must be unique within the egg (`400`) |
| `rules` | string | required Laravel rule string, e.g. `required|string|max:20`; unknown rule → `400` |
| `default_value` | string\|null | key must be present |
| `user_viewable` | bool | optional, default `false` |
| `user_editable` | bool | optional, default `false` |

Note the object name is `egg` (upstream transformer quirk), not `egg_variable`:

```json
{"object": "egg", "attributes": {"id": 74, "egg_id": 15, "name": "Jar", "description": "the jar",
 "env_variable": "JARFILE", "default_value": "server.jar", "user_viewable": true, "user_editable": false,
 "rules": "required|string|max:20", "created_at": "2026-09-18T15:35:57.000000Z", "updated_at": "2026-09-18T15:35:57.000000Z"}}
```

---

## Nodes

### `GET /nodes/{id}/system-information` — ACL `nodes` R

Live call to Wings; a node that is offline returns a `5xx` `DaemonConnectionException`-style error.

```json
{"version": "1.13.3", "system": {"type": "Linux", "arch": "arm64", "release": "6.12.54-linuxkit", "cpus": 8}}
```

### `POST /nodes/{id}/auto-deploy-token` — session-only

No body. Reuses (or creates) an application API key owned by the current admin with `r_nodes = 3` and returns its full
token. The key shows up in `GET /api-keys` as "Automatically generated node deployment key.".

```json
{"node": 1, "token": "ptla_BD1DEF093m0XUX9WTV8ArcObAlhGhDmqyEFRmd1M2F2"}
```

Use it for `cd /etc/pterodactyl && sudo wings configure --panel-url <url> --token <token> --node <node>`.

### `PATCH /nodes/{node}/allocations/{allocation}` — ACL `allocations` RW

Body `{"ip_alias": "play.example.com"}`; the key must be present, `null`/`""` clears the alias; max 191.

```json
{"object": "allocation", "attributes": {"id": 7, "ip": "10.9.9.9", "alias": "play.example.com", "port": 30000, "notes": null, "assigned": false}}
```

### `DELETE /nodes/{node}/allocations` — ACL `allocations` RW

Bulk delete with a JSON body, exactly one of:

- `{"ids": [7, 8]}` — array of ints, min 1
- `{"ip": "10.9.9.9"}` — every allocation of that IP on the node

Allocations assigned to a server, on another node, or unknown are silently skipped. Returns `200`:

```json
{"deleted": 2}
```

---

## Servers — ACL `servers` RW

### `POST /servers/{id}/transfer`

| Field | Type | Rules |
|---|---|---|
| `node_id` | int | required, exists, must differ from the current node (`400`) |
| `allocation_id` | int | required, exists, not the primary allocation of any server |
| `allocation_additional` | int[]\|null | optional |

All allocations must be unassigned and on the target node (`400` otherwise); `400` if the node lacks memory/disk;
`409` if the server is installing, restoring a backup or already transferring. Success: `202`, empty body.
**Only the validation/`400` paths were verified** (the dev stack has a single node); the success path is a line-for-line
port of the Blade controller.

### `POST /servers/{id}/toggle-install`

No body. Flips `status` between `null` (installed) and `"installing"`; `400` if the status is `install_failed`. Returns
the `server` item. **Not executed against the dev server** (only routing/authorization verified).

---

## Settings — session-only

Setting keys are the literal colon-separated names used by the panel (`"app:name"`), identical in GET and PATCH. GET
shape:

```json
{"object": "settings", "attributes": { "...": "..." }, "meta": {"environment_only": false, "...": "..."}}
```

`meta.environment_only` = `APP_ENVIRONMENT_ONLY`; when `true` saved values are **not** applied by the panel (the Blade
UI shows a warning banner and still allows saving; do the same). Every PATCH is full-object, returns `204`, and restarts
the queue worker. JSON booleans are accepted where the rules say `"true"|"false"`.

### `GET /settings/general`, `PATCH /settings/general`

```json
{"object": "settings",
 "attributes": {"app:name": "Pterodactyl", "app:locale": "en", "pterodactyl:auth:2fa_required": 0},
 "meta": {"languages": {"en": "English"}, "environment_only": false}}
```

| Field | Rules |
|---|---|
| `app:name` | required string, max 191 |
| `app:locale` | required, a key of `meta.languages` |
| `pterodactyl:auth:2fa_required` | required int: `0` nobody, `1` admins, `2` everyone |

### `GET /settings/mail`, `PATCH /settings/mail`, `POST /settings/mail/test`

```json
{"object": "settings",
 "attributes": {"mail:mailers:smtp:host": "127.0.0.1", "mail:mailers:smtp:port": 2525, "mail:mailers:smtp:encryption": "tls",
                "mail:mailers:smtp:username": null, "mail:from:address": "dev@example.com",
                "mail:from:name": "Pterodactyl Panel", "has_password": false},
 "meta": {"driver": "log", "disabled": true, "environment_only": false}}
```

When `meta.disabled` is `true` (mail driver is not `smtp`) the form must be read-only: PATCH returns `400`
"This feature is only available if SMTP is the selected email driver for the Panel.". The password is never returned.

| Field | Rules |
|---|---|
| `mail:mailers:smtp:host` | required string |
| `mail:mailers:smtp:port` | required int 1-65535 |
| `mail:mailers:smtp:encryption` | key must be present: `null`, `"tls"` or `"ssl"` |
| `mail:mailers:smtp:username` | nullable string, max 191 |
| `mail:mailers:smtp:password` | nullable string, max 191. Omit/empty = keep current; the literal `"!e"` = clear it |
| `mail:from:address` | required email |
| `mail:from:name` | nullable string, max 191 |

`POST /settings/mail/test`: no body, sends a test mail to the current admin; `204`, or `400` with the mailer's error
message in `detail`. Verified with the `log` driver. **The successful `PATCH /settings/mail` path was not verified** (dev
stack uses `MAIL_DRIVER=log`); it shares its persistence code with the other two PATCH endpoints, which were.

### `GET /settings/advanced`, `PATCH /settings/advanced`

```json
{"object": "settings",
 "attributes": {"recaptcha:enabled": false, "recaptcha:website_key": "6LcJcjwUAAAAAO_Xqjrtj9wWufUpYRnK6BW8lnfn",
                "has_recaptcha_secret_key": true, "pterodactyl:guzzle:timeout": 15, "pterodactyl:guzzle:connect_timeout": 5,
                "pterodactyl:client_features:allocations:enabled": false,
                "pterodactyl:client_features:allocations:range_start": null,
                "pterodactyl:client_features:allocations:range_end": null},
 "meta": {"recaptcha_using_shipped_keys": true, "environment_only": false}}
```

`meta.recaptcha_using_shipped_keys`: show the "you are using the default reCAPTCHA keys" warning.

| Field | Rules |
|---|---|
| `recaptcha:enabled` | required bool |
| `recaptcha:website_key` | required string, max 191 |
| `recaptcha:secret_key` | nullable string, max 191. Never returned; omit/empty = keep current (differs from Blade, where it is required) |
| `pterodactyl:guzzle:timeout` | required int 1-60 |
| `pterodactyl:guzzle:connect_timeout` | required int 1-60 |
| `pterodactyl:client_features:allocations:enabled` | required bool |
| `pterodactyl:client_features:allocations:range_start` | int 1024-65535, required when enabled, else nullable |
| `pterodactyl:client_features:allocations:range_end` | same, and must be greater than `range_start` |

---

## Application API keys — session-only

| Method | Path | Notes |
|---|---|---|
| GET | `/api-keys` | all application keys on the panel (all admins), not paginated |
| GET | `/api-keys/resources` | data for the permission matrix |
| POST | `/api-keys` | 201; full token returned **once** in `meta.secret_token` |
| DELETE | `/api-keys/{identifier}` | 204; `404` for an unknown identifier |

`GET /api-keys/resources`:

```json
{"resources": ["allocations", "database_hosts", "eggs", "locations", "nests", "nodes", "server_databases", "servers", "users"],
 "permissions": {"none": 0, "read": 1, "read_write": 3}}
```

POST body: `memo` (description; string|null, max 500, key required) plus optional `r_<resource>` int `0..3` for each
resource above (omitted = `0`). Use only `0`, `1`, `3`.

```json
{"object": "api_key",
 "attributes": {"identifier": "ptla_L363UxyKY8A", "description": "curl test key", "user_id": 1, "allowed_ips": [],
                "permissions": {"servers": 0, "nodes": 1, "allocations": 0, "users": 0, "locations": 0, "nests": 3,
                                "eggs": 3, "database_hosts": 1, "server_databases": 0},
                "last_used_at": null, "created_at": "2026-09-18T15:37:08+00:00"},
 "meta": {"secret_token": "ptla_L363UxyKY8A6Ho5t7vrG3lms7pWGdwgQHywIehoAMzm"}}
```

List items have the same `attributes` and no `meta`.
