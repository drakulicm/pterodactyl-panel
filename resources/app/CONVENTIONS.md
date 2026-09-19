# resources/app conventions

New panel frontend. Self-contained pnpm package (run all pnpm commands from `resources/app`). The legacy UI in `resources/scripts` is reference only: port logic from it, never import from it, never edit it.

## Stack

React 19, Vite, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind v4, shadcn/ui on **Base UI** (`@base-ui/react`, style `base-nova`), TanStack Router (code-defined tree in `src/router.tsx`), TanStack Query, zustand, react-hook-form + zod 4, axios, lucide-react, sonner, date-fns.

**Never add `@radix-ui/*` or `radix-ui`.** Add shadcn components with `pnpm dlx shadcn@latest add -y <name>` (never `-o` on existing files), then check `package.json` has no radix entry. Base UI differences: use the `render` prop instead of `asChild` (`<DialogTrigger render={<Button />}>`, `<Button render={<Link to='/' />}>`).

## Code style

- Prettier style: 4 spaces, single quotes (JSX too), semicolons, 120 cols.
- `const` arrow functions only. Components are `const X: React.FC<{ inline props }> = (...) => {}` with named exports at the bottom of the file (`export { X };`, `export type { T };`). No default exports.
- No code comments. No inline styles. No native `<button>`: use `@/components/ui/button`.
- Early returns. Event handlers are named `handleX`. Booleans are `isX` / `hasX` / `canX`.
- No prop drilling of server data: call `useServer()` (`src/hooks/useServer.ts`) which returns `{ server, permissions }`.
- Animations: `ease-out`, 200ms (`transition-colors duration-200`). Reduced motion is handled globally in `src/styles/globals.css`, which strips movement but keeps fades and colour changes, so components do not need `motion-reduce:` variants.
- Use semantic tokens (`bg-card`, `text-muted-foreground`, `border`, `text-success`, `text-warning`, `text-destructive`) — never Tailwind palette literals like `text-emerald-500`, which do not follow the theme.
- Light and dark are both supported. The theme lives in `src/lib/theme.ts` + `src/stores/themeStore.ts`, and the `pterodactyl:theme` storage key is mirrored in the pre-paint script in `resources/views/templates/app.blade.php` — change one and you must change the other.

## Data

- `src/lib/http.ts`: `http` axios instance (cookies + XSRF), `httpErrorToHuman`, Fractal types, `getPaginationSet`, `withQueryBuilderParams`.
- API modules live in `src/api/**`. Each exports plain async functions for mutations and `xQueryOptions(...)` builders (`queryOptions`) for reads. Transform snake_case API payloads to camelCase typed objects in the module. Query keys start with `['server', uuid, ...]`, `['account', ...]` or `['admin', ...]`.
- Client API routes use the server **uuid** (`server.uuid`); URLs use the short id (`server.id`).
- Mutations: `useMutation`, on success `queryClient.invalidateQueries`, errors shown with `<FormError message={httpErrorToHuman(error)} />` inside forms or `toast.error(...)` for row actions. Success feedback via `toast.success`.
- Permissions: `hasPermission(permissions, 'file.create')`, `hasAnyPermission` from `src/lib/permissions.ts`. Hide actions the user cannot perform.
- Websocket: `useServerStore` (`socket`, `isConnected`, `powerState`) and `useSocketEvent(event, handler)`; event names in `src/lib/socketEvents.ts`.

## UI building blocks

- Page skeleton: `<PageHeader title='...'>{actions}</PageHeader>` then `<div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>`.
- Reuse: `FormError` (`components/auth/FormError`), `ConfirmDeleteButton`, `ListPagination`, `RouteError` (`components/layout/*`), shadcn `Empty*` for empty states, `Skeleton` for loading, `Field`/`FieldLabel`/`FieldError`/`FieldDescription`/`FieldGroup` for forms, `Dialog` for create/edit forms, `AlertDialog` for destructive confirms.
- Good reference files: `src/pages/account/AccountApiPage.tsx` (list + create form + delete), `src/components/account/TwoFactorCard.tsx` (dialogs), `src/components/server/PowerButtons.tsx`.

## Routing

Routes are registered only in `src/router.tsx`; server sidebar links only in `src/components/layout/ServerNav.tsx`. Server pages are children of `serverRoute` (`/server/$id`). Keep URLs compatible with the legacy panel (`/server/:id/databases`, `/schedules/:id`, ...).

## Verify

`pnpm typecheck` must pass. `pnpm build` writes to `public/build`, which the dev panel at http://localhost:8080 serves (login `admin` / `password`, test server `ffb08c0c`).

## Admin area (`src/admin/**`)

The admin SPA replaces the Blade admin (`resources/views/admin/**`, controllers in `app/Http/Controllers/Admin/**` — use them as the behavioural reference: same fields, same validation messages, same warnings/notices, same destructive-action guards).

- Data comes from the Application API (`/api/application/**`) authenticated by the session cookie. Source of truth for payloads: `routes/api-application.php`, the controllers under `app/Http/Controllers/Api/Application/**`, their Form Requests under `app/Http/Requests/Api/Application/**` (validation rules = form fields), transformers under `app/Transformers/Api/Application/**` (response shape, available `include`s) and, when present, `resources/app/ADMIN_API.md`. Verify shapes with curl before coding against them.
- Generic client: `src/admin/api/client.ts` (`adminList`, `adminGet`, `adminPost`, `adminPatch`, `adminDelete`, `adminListQueryOptions`, `adminItemQueryOptions`). Admin modules keep the API's **snake_case attribute shape**, typed per resource in `src/admin/api/<section>.ts` (forms post the same keys back), relationships live under `attributes.relationships.<name>` as Fractal `{ object, data | attributes }` documents. List filters/sorts use `filters`/`sorts` (spatie query builder: check each controller's `allowedFilters`/`allowedSorts`). Query keys start with `['admin', '<path>', ...]`. **Invalidate with `invalidateAdmin(queryClient, '/mounts')`** (also from `client.ts`): TanStack matches key *elements*, not string prefixes, so `{ queryKey: ['admin', '/mounts'] }` does **not** match a detail key like `['admin', '/mounts/4']` and leaves detail pages stale.
- Each section owns exactly one routes file `src/admin/routes/<section>.tsx` exporting `<section>Routes` (an array of routes whose parent is `adminRoute` from `src/admin/adminRoute.tsx`). The stubs already define the URL contract; keep those exact paths and exported variable names, replace the placeholder components (use `lazyRouteComponent(() => import('@/admin/pages/<section>/XPage'), 'XPage')` so admin code stays out of the client bundle), and add `validateSearch` (zod) for tabs (`?tab=`) or extra child paths if needed. Never edit `src/router.tsx`, `src/admin/components/AdminSidebar.tsx`, another section's routes file, or shared components; if a shared component needs a change, note it in your final report instead.
- Pages go in `src/admin/pages/<section>/`, section components in `src/admin/components/<section>/`. Reuse `AdminDataTable` (`src/admin/components/AdminDataTable.tsx`) for lists, `PageHeader` with primary action buttons on the right, `Card` sections for forms, `Tabs` via `?tab=` search param for multi-tab detail pages, `Dialog` for small create/edit forms, `AlertDialog` for destructive actions.
- Cross-section links (e.g. server → node → location, user → servers) must be typed `<Link to='/admin/nodes/view/$nodeId' params={{ nodeId: String(id) }}>` using the paths in the stubs.
