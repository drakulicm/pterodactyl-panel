import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminApiKeysRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/api',
    component: lazyRouteComponent(() => import('@/admin/pages/apiKeys/ApiKeysPage'), 'ApiKeysPage'),
});

const apiKeysRoutes = [adminApiKeysRoute];

export { apiKeysRoutes };
