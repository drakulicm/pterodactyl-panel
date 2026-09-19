import { Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

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
            <SidebarProvider>
                <AppSidebar onSearchOpen={() => setIsSearchOpen(true)} />
                <SidebarInset className='h-svh overflow-y-auto'>
                    <Outlet />
                </SidebarInset>
                <CommandPalette isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
            </SidebarProvider>
        </TooltipProvider>
    );
};

export { AppLayout };
