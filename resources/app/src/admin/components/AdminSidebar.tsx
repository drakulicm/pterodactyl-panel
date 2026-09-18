import { Link, useRouterState } from '@tanstack/react-router';
import {
    ArrowLeftIcon,
    DatabaseIcon,
    EggIcon,
    GlobeIcon,
    HardDriveIcon,
    KeyRoundIcon,
    LayoutDashboardIcon,
    ServerIcon,
    SettingsIcon,
    ShieldIcon,
    UsersIcon,
    WaypointsIcon,
} from 'lucide-react';

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
import { siteConfiguration } from '@/lib/session';

const ADMIN_GROUPS = [
    {
        label: 'Basic administration',
        links: [
            { to: '/admin', label: 'Overview', icon: LayoutDashboardIcon },
            { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
            { to: '/admin/api', label: 'Application API', icon: KeyRoundIcon },
        ],
    },
    {
        label: 'Management',
        links: [
            { to: '/admin/databases', label: 'Databases', icon: DatabaseIcon },
            { to: '/admin/locations', label: 'Locations', icon: GlobeIcon },
            { to: '/admin/nodes', label: 'Nodes', icon: WaypointsIcon },
            { to: '/admin/servers', label: 'Servers', icon: ServerIcon },
            { to: '/admin/users', label: 'Users', icon: UsersIcon },
        ],
    },
    {
        label: 'Service management',
        links: [
            { to: '/admin/mounts', label: 'Mounts', icon: HardDriveIcon },
            { to: '/admin/nests', label: 'Nests', icon: EggIcon },
        ],
    },
] as const;

const AdminSidebar: React.FC = () => {
    const pathname = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, '') });

    return (
        <Sidebar collapsible='icon'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' render={<Link to='/admin' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <ShieldIcon className='size-4' />
                            </div>
                            <div className='grid flex-1 text-left leading-tight'>
                                <span className='truncate font-semibold'>{siteConfiguration.name}</span>
                                <span className='truncate text-xs text-muted-foreground'>Administration</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {ADMIN_GROUPS.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.links.map(({ to, label, icon: Icon }) => (
                                    <SidebarMenuItem key={to}>
                                        <SidebarMenuButton
                                            isActive={to === '/admin' ? pathname === to : pathname.startsWith(to)}
                                            tooltip={label}
                                            render={<Link to={to} />}
                                        >
                                            <Icon />
                                            <span>{label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
                <SidebarGroup className='mt-auto'>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip='Exit admin' render={<Link to='/' />}>
                                    <ArrowLeftIcon />
                                    <span>Exit admin</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
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

export { AdminSidebar };
