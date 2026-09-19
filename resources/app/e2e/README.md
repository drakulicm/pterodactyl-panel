# End-to-end tests

Playwright specs that drive the built frontend against a running panel.

```bash
pnpm build                  # e2e runs against public/build, not the dev server
pnpm test:e2e               # all specs
pnpm test:e2e e2e/auth.spec.ts
pnpm exec playwright test --ui
```

The panel is expected at `E2E_BASE_URL` (default `http://localhost:8080`, the
`compose.dev.yml` stack) with `APP_NEW_UI` and `APP_NEW_ADMIN` enabled, and an
administrator account in `E2E_USERNAME` / `E2E_PASSWORD` (default `admin` / `password`).

`auth.setup.ts` logs in once and saves the session to `e2e/.auth/state.json`; every spec
except `auth.spec.ts` reuses it. Keep it that way: the login endpoint is throttled to 10
attempts per minute per IP, so specs that log in for real have to stay rare. A full run
spends three of those attempts, so running the whole suite four or more times inside a
minute will start failing on the login itself — wait a minute rather than chasing it.

The specs only cover what the panel can do on its own. Anything that needs Wings — the
console, power actions, the file manager, backups, creating a server — is not covered
here and still needs a stack with a working node behind it.
