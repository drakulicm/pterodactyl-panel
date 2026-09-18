import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { adminRoute } from '@/admin/adminRoute';

const adminSettingsRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/settings',
    component: lazyRouteComponent(() => import('@/admin/pages/settings/SettingsGeneralPage'), 'SettingsGeneralPage'),
});

const adminSettingsMailRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/settings/mail',
    component: lazyRouteComponent(() => import('@/admin/pages/settings/SettingsMailPage'), 'SettingsMailPage'),
});

const adminSettingsAdvancedRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/settings/advanced',
    component: lazyRouteComponent(() => import('@/admin/pages/settings/SettingsAdvancedPage'), 'SettingsAdvancedPage'),
});

const settingsRoutes = [adminSettingsRoute, adminSettingsMailRoute, adminSettingsAdvancedRoute];

export { settingsRoutes };
