import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminUsersRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/users',
    component: lazyRouteComponent(() => import('@/admin/pages/users/UsersPage'), 'UsersPage'),
});

const adminUserNewRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/users/new',
    component: lazyRouteComponent(() => import('@/admin/pages/users/UserNewPage'), 'UserNewPage'),
});

const adminUserRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/users/view/$userId',
    component: lazyRouteComponent(() => import('@/admin/pages/users/UserViewPage'), 'UserViewPage'),
});

const usersRoutes = [adminUsersRoute, adminUserNewRoute, adminUserRoute];

export { usersRoutes };
