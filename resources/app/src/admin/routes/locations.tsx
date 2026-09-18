import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminLocationsRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/locations',
    component: lazyRouteComponent(() => import('@/admin/pages/locations/LocationsPage'), 'LocationsPage'),
});

const adminLocationRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/locations/view/$locationId',
    component: lazyRouteComponent(() => import('@/admin/pages/locations/LocationPage'), 'LocationPage'),
});

const locationsRoutes = [adminLocationsRoute, adminLocationRoute];

export { locationsRoutes };
