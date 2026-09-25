import { Outlet } from '@tanstack/react-router';
import { Suspense, useEffect, useState } from 'react';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const isSidebarPinned = document.cookie.split('; ').includes('sidebar_state=true');

const AppLayout: React.FC = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsSearchOpen((previous) => !previous);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <TooltipProvider>
            <SidebarProvider defaultOpen={isSidebarPinned}>
                <AppSidebar onSearchOpen={() => setIsSearchOpen(true)} />
                <SidebarInset className='h-svh overflow-y-auto'>
                    <Suspense>
                        <Outlet />
                    </Suspense>
                </SidebarInset>
                <CommandPalette isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
            </SidebarProvider>
        </TooltipProvider>
    );
};

export { AppLayout };
