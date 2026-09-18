import { Outlet } from '@tanstack/react-router';

import { AdminSidebar } from '@/admin/components/AdminSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const AdminLayout: React.FC = () => {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AdminSidebar />
                <SidebarInset className='h-svh overflow-y-auto'>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
};

export { AdminLayout };
