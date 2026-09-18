import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminDatabasesRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/databases',
    component: lazyRouteComponent(() => import('@/admin/pages/databases/DatabaseHostsPage'), 'DatabaseHostsPage'),
});

const adminDatabaseRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/databases/view/$hostId',
    component: lazyRouteComponent(() => import('@/admin/pages/databases/DatabaseHostPage'), 'DatabaseHostPage'),
});

const databasesRoutes = [adminDatabasesRoute, adminDatabaseRoute];

export { databasesRoutes };
