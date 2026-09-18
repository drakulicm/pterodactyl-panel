import { Outlet } from '@tanstack/react-router';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const AppLayout: React.FC = () => {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className='h-svh overflow-y-auto'>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
};

export { AppLayout };
