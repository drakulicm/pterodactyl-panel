import { Link } from '@tanstack/react-router';
import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TABS = [
    { to: '/admin/settings', label: 'General' },
    { to: '/admin/settings/mail', label: 'Mail' },
    { to: '/admin/settings/advanced', label: 'Advanced' },
] as const;

const SettingsLayout: React.FC<{
    isEnvironmentOnly?: boolean;
    children: ReactNode;
}> = ({ isEnvironmentOnly, children }) => {
    return (
        <>
            <PageHeader title='Settings' />
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <nav className='flex w-fit items-center gap-1 rounded-lg bg-muted p-1' aria-label='Settings sections'>
                    {TABS.map((tab) => (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            activeOptions={{ exact: true }}
                            className='rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground'
                            activeProps={{ className: 'bg-background text-foreground shadow-sm' }}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
                {isEnvironmentOnly && (
                    <Alert variant='destructive'>
                        <TriangleAlertIcon />
                        <AlertDescription>
                            Your Panel is currently configured to read settings from the environment only. You will need
                            to set <code className='font-mono text-xs'>APP_ENVIRONMENT_ONLY=false</code> in your
                            environment file in order to load settings dynamically.
                        </AlertDescription>
                    </Alert>
                )}
                {children}
            </div>
        </>
    );
};

export { SettingsLayout };
