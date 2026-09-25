import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon, UserIcon } from 'lucide-react';

import { SIDEBAR_LABEL_CLASSES } from '@/components/layout/SidebarNavItem';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { http } from '@/lib/http';
import { cn } from '@/lib/utils';
import { THEMES, type ThemeId, type ThemeMode } from '@/lib/theme';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';

const MODE_OPTIONS = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: MonitorIcon },
] as const;

const SidebarUserMenu: React.FC<{
    isRail?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}> = ({ isRail = false, onOpenChange }) => {
    const user = useSessionStore((state) => state.user);
    const theme = useThemeStore((state) => state.theme);
    const mode = useThemeStore((state) => state.mode);
    const setTheme = useThemeStore((state) => state.setTheme);
    const setMode = useThemeStore((state) => state.setMode);
    const logout = useMutation({
        mutationFn: () => http.post('/auth/logout'),
        onSettled: () => {
            window.location.href = '/auth/login';
        },
    });

    const menu = (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                render={
                    isRail ? (
                        <Button
                            variant='ghost'
                            className='h-12 w-full justify-start gap-2 rounded-none px-[7px] font-normal hover:bg-sidebar-accent/60 aria-expanded:bg-sidebar-accent dark:hover:bg-sidebar-accent/60'
                        />
                    ) : (
                        <SidebarMenuButton size='lg' />
                    )
                }
            >
                <Avatar className='size-8 rounded-lg'>
                    <AvatarFallback className='rounded-lg'>{user?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div
                    className={cn(
                        'grid min-w-0 flex-1 text-left text-sm leading-tight',
                        isRail && SIDEBAR_LABEL_CLASSES,
                    )}
                >
                    <span className='truncate font-medium'>{user?.username}</span>
                    <span className='truncate text-xs text-muted-foreground'>{user?.email}</span>
                </div>
                <ChevronsUpDownIcon className={cn('ml-auto size-4', isRail && SIDEBAR_LABEL_CLASSES)} />
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
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <PaletteIcon />
                            Theme
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className='min-w-44'>
                            <DropdownMenuRadioGroup
                                value={theme}
                                onValueChange={(value) => setTheme(value as ThemeId)}
                            >
                                {THEMES.map(({ id, label }) => (
                                    <DropdownMenuRadioItem key={id} value={id}>
                                        {label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={mode}
                        onValueChange={(value) => setMode(value as ThemeMode)}
                    >
                        {MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
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
    );

    if (isRail) {
        return menu;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>{menu}</SidebarMenuItem>
        </SidebarMenu>
    );
};

export { SidebarUserMenu };
