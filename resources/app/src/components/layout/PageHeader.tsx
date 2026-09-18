import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

const PageHeader: React.FC<{
    title: string;
    children?: ReactNode;
}> = ({ title, children }) => {
    return (
        <header className='flex h-14 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 data-vertical:h-4 data-vertical:self-center' />
            <h1 className='text-sm font-medium'>{title}</h1>
            <div className='ml-auto flex items-center gap-2'>{children}</div>
        </header>
    );
};

export { PageHeader };
