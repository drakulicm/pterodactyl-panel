import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminMountsRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/mounts',
    component: lazyRouteComponent(() => import('@/admin/pages/mounts/MountsPage'), 'MountsPage'),
});

const adminMountRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/mounts/view/$mountId',
    component: lazyRouteComponent(() => import('@/admin/pages/mounts/MountViewPage'), 'MountViewPage'),
});

const mountsRoutes = [adminMountsRoute, adminMountRoute];

export { mountsRoutes };
