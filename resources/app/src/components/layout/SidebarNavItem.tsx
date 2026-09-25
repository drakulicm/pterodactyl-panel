import { useRender } from '@base-ui/react/use-render';
import type { ReactElement, ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SIDEBAR_LABEL_CLASSES =
    '-translate-x-1 opacity-0 transition-[opacity,transform] duration-200 ease-out group-data-[expanded=true]/app-sidebar:translate-x-0 group-data-[expanded=true]/app-sidebar:opacity-100 group-data-[expanded=true]/app-sidebar:delay-[calc(var(--sidebar-item-index,0)*12ms)]';

const SidebarNavItem: React.FC<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    render?: ReactElement;
    trailing?: ReactNode;
    className?: string;
    onClick?: () => void;
}> = ({ label, icon: Icon, isActive = false, render, trailing, className, onClick }) =>
    useRender({
        render: render ?? <Button variant='ghost' />,
        props: {
            'data-sidebar-item': '',
            'data-active': isActive ? '' : undefined,
            'aria-current': isActive ? 'page' : undefined,
            className: cn(
                buttonVariants({ variant: 'ghost' }),
                'relative z-10 h-9 w-full justify-start gap-1.5 rounded-lg pr-2.5 pl-0 font-normal text-sidebar-foreground/70 transition-[color,transform] duration-150 ease-out hover:bg-transparent hover:text-sidebar-foreground focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-inset active:not-aria-[haspopup]:translate-y-0 active:scale-[0.98] dark:hover:bg-transparent',
                isActive && 'font-medium text-sidebar-accent-foreground hover:text-sidebar-accent-foreground',
                className,
            ),
            onClick,
            children: (
                <>
                    <span className='flex size-9 shrink-0 items-center justify-center'>
                        <Icon
                            className={cn('size-4 transition-colors duration-200 ease-out', isActive && 'text-sidebar-primary')}
                        />
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-left', SIDEBAR_LABEL_CLASSES)}>{label}</span>
                    {trailing}
                </>
            ),
        },
    });

const SidebarDivider: React.FC = () => (
    <span className='mx-0.5 my-1.5 h-px shrink-0 bg-sidebar-border transition-[clip-path] duration-250 ease-out-strong [clip-path:inset(0_calc(100%-32px)_0_0)] group-data-[expanded=true]/app-sidebar:[clip-path:inset(0)]' />
);

export { SIDEBAR_LABEL_CLASSES, SidebarDivider, SidebarNavItem };
