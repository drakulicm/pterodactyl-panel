import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';

import { adminRoute } from '@/admin/adminRoute';

const eggTabSchema = z.object({
    tab: z.enum(['configuration', 'variables', 'install']).default('configuration').catch('configuration'),
});

const eggNewSearchSchema = z.object({
    nest: z.coerce.number().optional().catch(undefined),
});

const adminNestsRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nests',
    component: lazyRouteComponent(() => import('@/admin/pages/nests/NestsPage'), 'NestsPage'),
});

const adminNestRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nests/view/$nestId',
    component: lazyRouteComponent(() => import('@/admin/pages/nests/NestViewPage'), 'NestViewPage'),
});

const adminEggNewRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nests/egg/new',
    validateSearch: eggNewSearchSchema,
    component: lazyRouteComponent(() => import('@/admin/pages/nests/EggNewPage'), 'EggNewPage'),
});

const adminEggRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nests/egg/$eggId',
    validateSearch: eggTabSchema,
    component: lazyRouteComponent(() => import('@/admin/pages/nests/EggViewPage'), 'EggViewPage'),
});

const nestsRoutes = [adminNestsRoute, adminNestRoute, adminEggNewRoute, adminEggRoute];

export { nestsRoutes };
