import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfiguration } from '@/lib/session';

const AuthLayout: React.FC<{
    title: string;
    description?: string;
    children: ReactNode;
}> = ({ title, description, children }) => {
    return (
        <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6'>
            <span className='text-lg font-semibold tracking-tight'>{siteConfiguration.name}</span>
            <Card className='w-full max-w-sm'>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
            <p className='text-xs text-muted-foreground'>
                &copy; 2015 - {new Date().getFullYear()}{' '}
                <a href='https://pterodactyl.io' target='_blank' rel='noopener noreferrer' className='hover:underline'>
                    Pterodactyl Software
                </a>
            </p>
        </div>
    );
};

export { AuthLayout };
