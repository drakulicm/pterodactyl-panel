import { createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { adminRoute } from '@/admin/adminRoute';
import { overviewRoutes } from '@/admin/routes/overview';
import { settingsRoutes } from '@/admin/routes/settings';
import { apiKeysRoutes } from '@/admin/routes/apiKeys';
import { databasesRoutes } from '@/admin/routes/databases';
import { locationsRoutes } from '@/admin/routes/locations';
import { nodesRoutes } from '@/admin/routes/nodes';
import { serversRoutes } from '@/admin/routes/servers';
import { usersRoutes } from '@/admin/routes/users';
import { mountsRoutes } from '@/admin/routes/mounts';
import { nestsRoutes } from '@/admin/routes/nests';
import { serverQueryOptions } from '@/api/server/server';
import { AppLayout } from '@/components/layout/AppLayout';
import { RouteError } from '@/components/layout/RouteError';
import { ServerLayout } from '@/components/server/ServerLayout';
import { ServerPermissionGate } from '@/components/server/ServerPermissionGate';
import { http, isTwoFactorRequiredError } from '@/lib/http';
import { queryClient } from '@/lib/queryClient';
import { sessionUser } from '@/lib/session';
import { rootRoute } from '@/routes/root';
import { LoginPage } from '@/pages/auth/LoginPage';

const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth',
    component: Outlet,
});

const loginRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/login',
    component: LoginPage,
});

const loginCheckpointRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/login/checkpoint',
    component: lazyRouteComponent(() => import('@/pages/auth/LoginCheckpointPage'), 'LoginCheckpointPage'),
});

const forgotPasswordRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/password',
    component: lazyRouteComponent(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage'),
});

const resetPasswordRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '/password/reset/$token',
    validateSearch: z.object({ email: z.string().catch('') }),
    component: lazyRouteComponent(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage'),
});

const authFallbackRoute = createRoute({
    getParentRoute: () => authRoute,
    path: '$',
    beforeLoad: () => {
        throw redirect({ to: '/auth/login' });
    },
});

const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'app',
    beforeLoad: () => {
        if (!sessionUser) {
            throw redirect({ to: '/auth/login' });
        }
    },
    component: AppLayout,
});

const dashboardRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/',
    component: lazyRouteComponent(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage'),
});

const accountRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/account',
    component: lazyRouteComponent(() => import('@/pages/account/AccountPage'), 'AccountPage'),
});

const accountApiRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/account/api',
    component: lazyRouteComponent(() => import('@/pages/account/AccountApiPage'), 'AccountApiPage'),
});

const accountSSHRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/account/ssh',
    component: lazyRouteComponent(() => import('@/pages/account/AccountSSHPage'), 'AccountSSHPage'),
});

const accountActivityRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/account/activity',
    component: lazyRouteComponent(() => import('@/pages/account/AccountActivityPage'), 'AccountActivityPage'),
});

const serverRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/server/$id',
    loader: ({ params }) => queryClient.ensureQueryData(serverQueryOptions(params.id)),
    component: ServerLayout,
    errorComponent: RouteError,
});

const serverConsoleRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/',
    component: lazyRouteComponent(() => import('@/pages/server/ServerConsolePage'), 'ServerConsolePage'),
});

const ServerFilesRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerFilesPage'), 'ServerFilesPage');

const serverFilesRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/files',
    component: () => (
        <ServerPermissionGate permission='file.*' title='Files'>
            <ServerFilesRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerFileEditRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerFileEditPage'), 'ServerFileEditRoutePage');

const serverFileEditRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/files/edit',
    component: () => (
        <ServerPermissionGate permission='file.*' title='Edit file'>
            <ServerFileEditRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerFileNewRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerFileEditPage'), 'ServerFileNewRoutePage');

const serverFileNewRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/files/new',
    component: () => (
        <ServerPermissionGate permission='file.create' title='New file'>
            <ServerFileNewRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerDatabasesRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerDatabasesPage'), 'ServerDatabasesPage');

const serverDatabasesRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/databases',
    component: () => (
        <ServerPermissionGate permission='database.*' title='Databases'>
            <ServerDatabasesRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerSchedulesRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerSchedulesPage'), 'ServerSchedulesPage');

const serverSchedulesRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/schedules',
    component: () => (
        <ServerPermissionGate permission='schedule.*' title='Schedules'>
            <ServerSchedulesRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerScheduleRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerSchedulePage'), 'ServerSchedulePage');

const serverScheduleRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/schedules/$scheduleId',
    component: () => (
        <ServerPermissionGate permission='schedule.*' title='Schedule'>
            <ServerScheduleRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerUsersRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerUsersPage'), 'ServerUsersPage');

const serverUsersRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/users',
    component: () => (
        <ServerPermissionGate permission='user.*' title='Users'>
            <ServerUsersRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerBackupsRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerBackupsPage'), 'ServerBackupsPage');

const serverBackupsRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/backups',
    component: () => (
        <ServerPermissionGate permission='backup.*' title='Backups'>
            <ServerBackupsRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerNetworkRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerNetworkPage'), 'ServerNetworkPage');

const serverNetworkRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/network',
    component: () => (
        <ServerPermissionGate permission='allocation.*' title='Network'>
            <ServerNetworkRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerStartupRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerStartupPage'), 'ServerStartupPage');

const serverStartupRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/startup',
    component: () => (
        <ServerPermissionGate permission='startup.*' title='Startup'>
            <ServerStartupRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerSettingsRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerSettingsPage'), 'ServerSettingsPage');

const serverSettingsRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/settings',
    component: () => (
        <ServerPermissionGate permission={['settings.*', 'file.sftp']} title='Settings'>
            <ServerSettingsRouteComponent />
        </ServerPermissionGate>
    ),
});

const ServerActivityRouteComponent = lazyRouteComponent(() => import('@/pages/server/ServerActivityPage'), 'ServerActivityPage');

const serverActivityRoute = createRoute({
    getParentRoute: () => serverRoute,
    path: '/activity',
    component: () => (
        <ServerPermissionGate permission='activity.*' title='Activity'>
            <ServerActivityRouteComponent />
        </ServerPermissionGate>
    ),
});

const routeTree = rootRoute.addChildren([
    adminRoute.addChildren([
        ...overviewRoutes,
        ...settingsRoutes,
        ...apiKeysRoutes,
        ...databasesRoutes,
        ...locationsRoutes,
        ...nodesRoutes,
        ...serversRoutes,
        ...usersRoutes,
        ...mountsRoutes,
        ...nestsRoutes,
    ]),
    authRoute.addChildren([
        loginRoute,
        loginCheckpointRoute,
        forgotPasswordRoute,
        resetPasswordRoute,
        authFallbackRoute,
    ]),
    appRoute.addChildren([
        dashboardRoute, accountRoute, accountApiRoute, accountSSHRoute, accountActivityRoute,
        serverRoute.addChildren([
            serverConsoleRoute,
            serverFilesRoute,
            serverFileEditRoute,
            serverFileNewRoute,
            serverDatabasesRoute,
            serverSchedulesRoute,
            serverScheduleRoute,
            serverUsersRoute,
            serverBackupsRoute,
            serverNetworkRoute,
            serverStartupRoute,
            serverSettingsRoute,
            serverActivityRoute,
        ]),
    ]),
]);

const router = createRouter({ routeTree, defaultPreload: 'intent' });

http.interceptors.response.use(undefined, (error: unknown) => {
    if (isTwoFactorRequiredError(error) && !window.location.pathname.startsWith('/account')) {
        router.navigate({ to: '/account', replace: true, state: { twoFactorRedirect: true } });
    }

    throw error;
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }

    interface HistoryState {
        confirmationToken?: string;
        twoFactorRedirect?: boolean;
    }
}

export { router };
