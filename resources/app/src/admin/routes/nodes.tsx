import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';

import { adminRoute } from '@/admin/adminRoute';

const nodeSearchSchema = z.object({
    tab: z.enum(['about', 'settings', 'configuration', 'allocation', 'servers']).catch('about').optional(),
});

const adminNodesRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nodes',
    component: lazyRouteComponent(() => import('@/admin/pages/nodes/NodesPage'), 'NodesPage'),
});

const adminNodeNewRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nodes/new',
    component: lazyRouteComponent(() => import('@/admin/pages/nodes/NodeNewPage'), 'NodeNewPage'),
});

const adminNodeRoute = createRoute({
    getParentRoute: () => adminRoute,
    path: '/nodes/view/$nodeId',
    validateSearch: nodeSearchSchema,
    component: lazyRouteComponent(() => import('@/admin/pages/nodes/NodeViewPage'), 'NodeViewPage'),
});

const nodesRoutes = [adminNodesRoute, adminNodeNewRoute, adminNodeRoute];

export { nodesRoutes };
