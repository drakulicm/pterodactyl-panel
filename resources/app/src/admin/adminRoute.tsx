import { createRoute, redirect } from '@tanstack/react-router';

import { AdminLayout } from '@/admin/components/AdminLayout';
import { RouteError } from '@/components/layout/RouteError';
import { sessionUser } from '@/lib/session';
import { rootRoute } from '@/routes/root';

const adminRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin',
    beforeLoad: () => {
        if (!sessionUser) {
            throw redirect({ to: '/auth/login' });
        }

        if (!sessionUser.rootAdmin) {
            throw redirect({ to: '/' });
        }
    },
    component: AdminLayout,
    errorComponent: RouteError,
});

export { adminRoute };
