import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { http } from '@/lib/http';
import type { Theme } from '@/lib/theme';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';

const THEME_OPTIONS = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: MonitorIcon },
] as const satisfies readonly { value: Theme; label: string; icon: React.ComponentType }[];

const SidebarUserMenu: React.FC = () => {
    const user = useSessionStore((state) => state.user);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const logout = useMutation({
        mutationFn: () => http.post('/auth/logout'),
        onSettled: () => {
            window.location.href = '/auth/login';
        },
    });

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<SidebarMenuButton size='lg' />}>
                        <Avatar className='size-8 rounded-lg'>
                            <AvatarFallback className='rounded-lg'>
                                {user?.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className='grid flex-1 text-left text-sm leading-tight'>
                            <span className='truncate font-medium'>{user?.username}</span>
                            <span className='truncate text-xs text-muted-foreground'>{user?.email}</span>
                        </div>
                        <ChevronsUpDownIcon className='ml-auto size-4' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side='top' align='start' className='min-w-56'>
                        <DropdownMenuGroup>
                            <DropdownMenuItem render={<Link to='/account' />}>
                                <UserIcon />
                                Account
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Theme</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={theme}
                                onValueChange={(value) => setTheme(value as Theme)}
                            >
                                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                                    <DropdownMenuRadioItem key={value} value={value}>
                                        <Icon />
                                        {label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
                                <LogOutIcon />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};

export { SidebarUserMenu };
