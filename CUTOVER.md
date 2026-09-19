# Cutover

How the new frontend replaces the upstream one, in four stages. Stages 1 to 3 are reversible by
flipping an environment variable; stage 4 is not, so it only happens once the earlier ones have held
in production for a while.

Nothing here introduces a database migration, so a rollback is only ever an image tag and a flag.

## Before any of it

- [ ] `.github/workflows/ci-fork.yaml` is green on the branch being shipped: frontend typecheck,
      unit tests and build; PHP code style, unit and integration tests; the end-to-end specs.
- [ ] The image for that commit has been built and pushed by `.github/workflows/docker-fork.yaml`.
- [ ] The target panel has a persistent volume at `/app/var`. The entrypoint stores the generated
      `APP_KEY` there and the panel returns 500s on every request without it.

## Stage 1 — staging, both flags

```
APP_NEW_UI=true
APP_NEW_ADMIN=true
```

- [ ] Restore a copy of production data onto staging first. Most of what breaks at this point breaks
      on real eggs, real nodes and real permission sets, not on seeded ones.
- [ ] Walk the client area against a server that is actually running: console, power actions, the
      file manager (upload, rename, delete, edit and save), backups, schedules, databases, network,
      startup variables, subusers. None of this is covered by the end-to-end specs, because all of it
      needs Wings.
- [ ] Walk the admin area: create and edit a node, check its configuration and auto-deploy token,
      create a server end to end, edit an egg and its variables, import and export an egg, change the
      panel settings and send a test email.
- [ ] Sign in as a non-admin subuser and confirm the pages they lack permission for are hidden rather
      than merely erroring.
- [ ] Check the browser console for errors on each area, and the panel log for 500s.

## Stage 2 — production, client area only

```
APP_NEW_UI=true
APP_NEW_ADMIN=false
```

- [ ] Announce a window. Every signed-in session lands on a different UI the moment the flag flips.
- [ ] Flip the flag, then confirm the login page, the dashboard and one running server's console.
- [ ] Watch the panel log and the error rate for a full peak period before moving on.

Rollback: set `APP_NEW_UI=false`. No rebuild, no restart of Wings, no data change.

## Stage 3 — production, admin area

```
APP_NEW_ADMIN=true
```

- [ ] Flip only after stage 2 has been stable for at least a week of normal use.
- [ ] Confirm the admin overview, one node's configuration page, and a server view.

Rollback: set `APP_NEW_ADMIN=false`, which restores the Blade admin.

## Stage 4 — delete the legacy frontend

Only once both flags have been on in production long enough that turning them off is no longer the
plan for anything. This is the step that pays for the fork: it removes the React 16 dependency tree
and roughly halves the image build.

- [ ] `resources/scripts` (the upstream frontend, ~156 components).
- [ ] `webpack.config.js`, `babel.config.js`, `jest.config.js`, `tailwind.config.js`,
      `postcss.config.js` and the root `package.json` / `yarn.lock`, all of which exist only for it.
- [ ] Stage 0 of the `Dockerfile` and the `COPY --from=0 /app/public/assets` line in stage 2.
- [ ] `resources/views/templates/wrapper.blade.php` and the other Blade views the old UI booted from.
- [ ] `public/assets`.
- [ ] The `config/ui.php` flags, and the `if (config('ui.new_admin'))` branch at the top of
      `routes/admin.php`, once there is nothing left to fall back to.
- [ ] `resources/views/admin/**` and `app/Http/Controllers/Admin/**`, the Blade admin that
      `APP_NEW_ADMIN=false` served. Check `routes/admin.php` for anything still pointing at them.
- [ ] `app/Http/Controllers/Base/LocaleController.php` and its `/locales/locale.json` route in
      `routes/base.php`. The new frontend does not use i18next; the activity log strings it needs
      live in `resources/app/src/lib/activity.ts`. `resources/lang` itself stays — the backend uses it
      for validation messages and mail.
- [ ] `resources/lang/en/activity.php`, once nothing reads it. Its contents are mirrored in
      `activity.ts`, which is the file to edit when an activity event is added.
- [ ] Update `FORK.md`: the layout table, the list of touched upstream files, and the note that
      `resources/scripts` is reference only.
- [ ] Update the upstream rebase instructions. After this the fork no longer merges cleanly with
      upstream frontend changes, which is the point, but it should be written down.

## Still missing after all of it

- The client area and admin are English only. i18next was removed rather than half-wired; adding
  real localization means extracting strings from ~179 components, and is its own project.
- Nothing reports frontend crashes. `router.tsx` and `admin/adminRoute.tsx` have error boundaries so
  a failure shows a page rather than a blank screen, but no one is told. Upstream has no crash
  reporting either, so this is an addition, not a regression.
