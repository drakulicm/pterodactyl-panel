import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminOverviewRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/',
    component: lazyRouteComponent(() => import('@/admin/pages/overview/OverviewPage'), 'OverviewPage'),
});

const overviewRoutes = [adminOverviewRoute];

export { overviewRoutes };
