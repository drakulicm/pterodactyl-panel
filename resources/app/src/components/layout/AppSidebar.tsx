import { Link, useParams, useRouterState } from '@tanstack/react-router';
import {
    HistoryIcon,
    KeyRoundIcon,
    LayoutGridIcon,
    PinIcon,
    PinOffIcon,
    SearchIcon,
    ServerIcon,
    ShieldIcon,
    TerminalIcon,
    UserIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ServerNav } from '@/components/layout/ServerNav';
import { SIDEBAR_LABEL_CLASSES, SidebarDivider, SidebarNavItem } from '@/components/layout/SidebarNavItem';
import { SidebarUserMenu } from '@/components/layout/SidebarUserMenu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { isNewAdminEnabled, sessionUser, siteConfiguration } from '@/lib/session';
import { cn } from '@/lib/utils';

const isApplePlatform = /mac|iphone|ipad/i.test(navigator.userAgent);

const ACCOUNT_LINKS = [
    { to: '/account', label: 'Account', icon: UserIcon },
    { to: '/account/api', label: 'API Credentials', icon: TerminalIcon },
    { to: '/account/ssh', label: 'SSH Keys', icon: KeyRoundIcon },
    { to: '/account/activity', label: 'Activity', icon: HistoryIcon },
] as const;

const movePill = (pill: HTMLElement | null, target: HTMLElement | null) => {
    if (!pill) {
        return;
    }

    if (!target) {
        pill.dataset.visible = 'false';

        return;
    }

    const transform = `translateY(${target.offsetTop}px)`;

    if (pill.dataset.visible !== 'true') {
        pill.style.transition = 'none';
        pill.style.transform = transform;
        pill.getBoundingClientRect();
        pill.style.transition = '';
    } else {
        pill.style.transform = transform;
    }

    pill.dataset.visible = 'true';
};

const hoveredItem = (target: EventTarget): HTMLElement | null =>
    target instanceof Element ? target.closest<HTMLElement>('[data-sidebar-item]') : null;

const PILL_CLASSES =
    'pointer-events-none absolute inset-x-[5px] top-0 h-9 rounded-lg opacity-0 transition-[transform,opacity,clip-path] duration-250 ease-out-strong [clip-path:inset(0_calc(100%-36px)_0_0_round_8px)] data-[visible=true]:opacity-100 group-data-[expanded=true]/app-sidebar:[clip-path:inset(0_round_8px)]';

const SidebarContents: React.FC<{
    isPinned?: boolean;
    onPinToggle?: () => void;
    onSearchOpen: () => void;
    onMenuOpenChange: (isOpen: boolean) => void;
}> = ({ isPinned, onPinToggle, onSearchOpen, onMenuOpenChange }) => {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const { id: serverId } = useParams({ strict: false });
    const listRef = useRef<HTMLElement>(null);
    const activePillRef = useRef<HTMLSpanElement>(null);
    const hoverPillRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const list = listRef.current;

        if (!list) {
            return;
        }

        const sync = () => {
            list.querySelectorAll<HTMLElement>('[data-sidebar-item]').forEach((item, index) =>
                item.style.setProperty('--sidebar-item-index', String(index)),
            );
            movePill(activePillRef.current, list.querySelector<HTMLElement>('[data-sidebar-item][data-active]'));
        };

        sync();

        const observer = new MutationObserver(sync);
        observer.observe(list, { subtree: true, childList: true, attributeFilter: ['data-active'] });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div className='flex h-14 shrink-0 items-center gap-2 px-[7px]'>
                <Link
                    to='/'
                    className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-transform duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]'
                >
                    <ServerIcon className='size-4' />
                    <span className='sr-only'>{siteConfiguration.name}</span>
                </Link>
                <span className={cn('flex-1 truncate text-sm font-semibold', SIDEBAR_LABEL_CLASSES)}>
                    {siteConfiguration.name}
                </span>
                {onPinToggle && (
                    <Button
                        variant='ghost'
                        size='icon-xs'
                        aria-pressed={isPinned}
                        aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                        className={cn('text-muted-foreground', SIDEBAR_LABEL_CLASSES)}
                        onClick={onPinToggle}
                    >
                        {isPinned ? <PinOffIcon /> : <PinIcon />}
                    </Button>
                )}
            </div>
            <nav
                ref={listRef}
                aria-label='Main'
                className='relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-[5px] pb-1'
                onPointerOver={(event) => movePill(hoverPillRef.current, hoveredItem(event.target))}
                onPointerLeave={() => movePill(hoverPillRef.current, null)}
                onFocus={(event) => movePill(hoverPillRef.current, hoveredItem(event.target))}
                onBlur={() => movePill(hoverPillRef.current, null)}
            >
                <span ref={hoverPillRef} aria-hidden='true' className={cn(PILL_CLASSES, 'bg-sidebar-accent/60')} />
                <span
                    ref={activePillRef}
                    aria-hidden='true'
                    className={cn(PILL_CLASSES, 'bg-sidebar-accent shadow-xs ring-1 ring-sidebar-border ring-inset')}
                />
                <SidebarNavItem
                    label='Search'
                    icon={SearchIcon}
                    trailing={
                        <kbd className={cn('font-mono text-xs text-muted-foreground', SIDEBAR_LABEL_CLASSES)}>
                            {isApplePlatform ? '⌘K' : 'Ctrl K'}
                        </kbd>
                    }
                    onClick={onSearchOpen}
                />
                <SidebarNavItem
                    label='Servers'
                    icon={LayoutGridIcon}
                    isActive={pathname === '/'}
                    render={<Link to='/' />}
                />
                {sessionUser?.rootAdmin && (
                    <SidebarNavItem
                        label='Admin'
                        icon={ShieldIcon}
                        render={isNewAdminEnabled ? <Link to='/admin' /> : <a href='/admin' />}
                    />
                )}
                {serverId && <ServerNav id={serverId} onMenuOpenChange={onMenuOpenChange} />}
                <SidebarDivider />
                {ACCOUNT_LINKS.map(({ to, label, icon }) => (
                    <SidebarNavItem
                        key={to}
                        label={label}
                        icon={icon}
                        isActive={pathname === to}
                        render={<Link to={to} />}
                    />
                ))}
            </nav>
            <div className='shrink-0 border-t py-1'>
                <SidebarUserMenu isRail onOpenChange={onMenuOpenChange} />
            </div>
        </>
    );
};

const AppSidebar: React.FC<{
    onSearchOpen: () => void;
}> = ({ onSearchOpen }) => {
    const { isMobile, open: isPinned, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [openMenus, setOpenMenus] = useState(0);
    const hoverTimer = useRef<number | undefined>(undefined);
    const isExpanded = isPinned || isHovered || isFocused || openMenus > 0;

    useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    const scheduleHover = (isOver: boolean) => {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => setIsHovered(isOver), isOver ? 80 : 200);
    };

    const handleMenuOpenChange = (isOpen: boolean) =>
        setOpenMenus((count) => Math.max(0, count + (isOpen ? 1 : -1)));

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetContent
                    side='left'
                    showCloseButton={false}
                    data-expanded='true'
                    className='group/app-sidebar w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground'
                >
                    <SheetHeader className='sr-only'>
                        <SheetTitle>Navigation</SheetTitle>
                        <SheetDescription>Pages of the panel, this server and your account.</SheetDescription>
                    </SheetHeader>
                    <SidebarContents
                        onSearchOpen={() => {
                            setOpenMobile(false);
                            onSearchOpen();
                        }}
                        onMenuOpenChange={() => undefined}
                    />
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div
            className={cn(
                'relative z-30 h-svh shrink-0 transition-[width] duration-200 ease-out',
                isPinned ? 'w-64' : 'w-16',
            )}
        >
            <div
                data-expanded={isExpanded}
                className={cn(
                    'group/app-sidebar absolute inset-y-2 left-2 flex w-60 flex-col overflow-hidden rounded-xl border bg-sidebar text-sidebar-foreground transition-[clip-path,box-shadow] duration-250 ease-out-strong [clip-path:inset(0_calc(100%-48px)_0_0_round_12px)] data-[expanded=true]:[clip-path:inset(-40px_round_12px)]',
                    isExpanded && !isPinned && 'shadow-2xl shadow-black/15',
                )}
                onPointerEnter={() => scheduleHover(true)}
                onPointerMove={() => {
                    if (!isHovered) {
                        scheduleHover(true);
                    }
                }}
                onPointerLeave={() => scheduleHover(false)}
                onFocus={(event) => {
                    if (event.target.matches(':focus-visible')) {
                        setIsFocused(true);
                    }
                }}
                onBlur={(event) => {
                    if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                        setIsFocused(false);
                    }
                }}
            >
                <SidebarContents
                    isPinned={isPinned}
                    onPinToggle={toggleSidebar}
                    onSearchOpen={onSearchOpen}
                    onMenuOpenChange={handleMenuOpenChange}
                />
            </div>
            <span
                aria-hidden='true'
                className={cn(
                    'pointer-events-none absolute inset-y-2 left-2 w-12 rounded-xl border transition-opacity duration-150 ease-out',
                    isExpanded && 'opacity-0',
                )}
            />
        </div>
    );
};

export { ACCOUNT_LINKS, AppSidebar };
