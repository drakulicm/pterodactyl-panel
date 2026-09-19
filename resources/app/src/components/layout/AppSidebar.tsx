import { Link, useParams, useRouterState } from '@tanstack/react-router';
import {
    HistoryIcon,
    KeyRoundIcon,
    SearchIcon,
    ServerIcon,
    ShieldIcon,
    TerminalIcon,
    UserIcon,
} from 'lucide-react';

import { ServerNav } from '@/components/layout/ServerNav';
import { SidebarUserMenu } from '@/components/layout/SidebarUserMenu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { isNewAdminEnabled, sessionUser, siteConfiguration } from '@/lib/session';

const isApplePlatform = /mac|iphone|ipad/i.test(navigator.userAgent);

const ACCOUNT_LINKS = [
    { to: '/account', label: 'Account', icon: UserIcon },
    { to: '/account/api', label: 'API Credentials', icon: TerminalIcon },
    { to: '/account/ssh', label: 'SSH Keys', icon: KeyRoundIcon },
    { to: '/account/activity', label: 'Activity', icon: HistoryIcon },
] as const;

const AppSidebar: React.FC<{
    onSearchOpen: () => void;
}> = ({ onSearchOpen }) => {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const { id: serverId } = useParams({ strict: false });

    return (
        <Sidebar collapsible='icon'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' render={<Link to='/' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <ServerIcon className='size-4' />
                            </div>
                            <span className='truncate font-semibold'>{siteConfiguration.name}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Panel</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip='Search' onClick={onSearchOpen}>
                                    <SearchIcon />
                                    <span>Search</span>
                                    <kbd className='ml-auto font-mono text-xs text-muted-foreground'>
                                        {isApplePlatform ? '⌘K' : 'Ctrl K'}
                                    </kbd>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={pathname === '/'}
                                    tooltip='Servers'
                                    render={<Link to='/' />}
                                >
                                    <ServerIcon />
                                    <span>Servers</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {sessionUser?.rootAdmin && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton tooltip='Admin' render={isNewAdminEnabled ? <Link to='/admin' /> : <a href='/admin' />}>
                                        <ShieldIcon />
                                        <span>Admin</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {serverId && <ServerNav id={serverId} />}
                <SidebarGroup>
                    <SidebarGroupLabel>Account</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
                                <SidebarMenuItem key={to}>
                                    <SidebarMenuButton isActive={pathname === to} tooltip={label} render={<Link to={to} />}>
                                        <Icon />
                                        <span>{label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarUserMenu />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
};

export { ACCOUNT_LINKS, AppSidebar };
