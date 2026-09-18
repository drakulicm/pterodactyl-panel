import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';

import { adminRoute } from '@/admin/adminRoute';

const serverTabSchema = z.object({
    tab: z
        .enum(['about', 'details', 'build', 'startup', 'database', 'mounts', 'manage', 'delete'])
        .catch('about'),
});

const adminServersRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/servers',
    component: lazyRouteComponent(() => import('@/admin/pages/servers/ServersPage'), 'ServersPage'),
});

const adminServerNewRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/servers/new',
    component: lazyRouteComponent(() => import('@/admin/pages/servers/ServerNewPage'), 'ServerNewPage'),
});

const adminServerRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/servers/view/$serverId',
    validateSearch: serverTabSchema,
    component: lazyRouteComponent(() => import('@/admin/pages/servers/ServerViewPage'), 'ServerViewPage'),
});

const serversRoutes = [adminServersRoute, adminServerNewRoute, adminServerRoute];

export { serversRoutes };
