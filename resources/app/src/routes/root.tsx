import { createRootRoute, Outlet } from '@tanstack/react-router';

import { Toaster } from '@/components/ui/sonner';

const rootRoute = createRootRoute({
    component: () => (
        <>
            <Outlet />
            <Toaster />
        </>
    ),
});

export { rootRoute };
