import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
    BookOpenIcon,
    CircleAlertIcon,
    CircleCheckIcon,
    CodeIcon,
    HardDriveIcon,
    HeartIcon,
    LifeBuoyIcon,
    MapPinIcon,
    ServerIcon,
    UsersIcon,
} from 'lucide-react';

import { type AdminCountPath, countQueryOptions, versionQueryOptions } from '@/admin/api/overview';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { httpErrorToHuman } from '@/lib/http';

const COUNT_CARDS = [
    { path: '/servers', label: 'Servers', to: '/admin/servers', icon: ServerIcon },
    { path: '/nodes', label: 'Nodes', to: '/admin/nodes', icon: HardDriveIcon },
    { path: '/users', label: 'Users', to: '/admin/users', icon: UsersIcon },
    { path: '/locations', label: 'Locations', to: '/admin/locations', icon: MapPinIcon },
] as const;

const CountCard: React.FC<{
    path: AdminCountPath;
    label: string;
    to: (typeof COUNT_CARDS)[number]['to'];
    icon: React.ComponentType<{ className?: string }>;
}> = ({ path, label, to, icon: Icon }) => {
    const count = useQuery(countQueryOptions(path));

    return (
        <Link to={to} className='group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50'>
            <Card className='transition-colors duration-200 ease-out group-hover:bg-accent/40'>
                <CardHeader>
                    <CardDescription className='flex items-center gap-2'>
                        <Icon className='size-4' />
                        {label}
                    </CardDescription>
                    <CardTitle className='text-2xl tabular-nums'>
                        {count.isPending ? <Skeleton className='h-8 w-12' /> : count.isError ? '-' : count.data}
                    </CardTitle>
                </CardHeader>
            </Card>
        </Link>
    );
};

const OverviewPage: React.FC = () => {
    const version = useQuery(versionQueryOptions);
    const panel = version.data?.panel;

    return (
        <>
            <PageHeader title='Administrative overview' />
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={version.error ? httpErrorToHuman(version.error) : null} />
                {version.isPending && <Skeleton className='h-16 rounded-lg' />}
                {panel && panel.is_latest && (
                    <Alert>
                        <CircleCheckIcon className='text-emerald-500' />
                        <AlertTitle>System information</AlertTitle>
                        <AlertDescription>
                            You are running Pterodactyl Panel version{' '}
                            <code className='rounded bg-muted px-1 font-mono text-xs'>{panel.current}</code>. Your panel
                            is up-to-date!
                        </AlertDescription>
                    </Alert>
                )}
                {panel && !panel.is_latest && (
                    <Alert variant='destructive'>
                        <CircleAlertIcon />
                        <AlertTitle>System information</AlertTitle>
                        <AlertDescription>
                            Your panel is <strong>not up-to-date!</strong> The latest version is{' '}
                            <a
                                href={`https://github.com/Pterodactyl/Panel/releases/v${panel.latest}`}
                                target='_blank'
                                rel='noreferrer'
                            >
                                <code className='font-mono text-xs'>{panel.latest}</code>
                            </a>{' '}
                            and you are currently running version{' '}
                            <code className='font-mono text-xs'>{panel.current}</code>. You can find instructions on how
                            to update your panel{' '}
                            <a href='https://pterodactyl.io/panel/1.0/updating.html' target='_blank' rel='noreferrer'>
                                here
                            </a>
                            .
                        </AlertDescription>
                    </Alert>
                )}
                <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                    {COUNT_CARDS.map((card) => (
                        <CountCard key={card.path} {...card} />
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Help and resources</CardTitle>
                        <CardDescription>
                            {version.data
                                ? `The latest Wings release is ${version.data.wings.latest}.`
                                : 'Useful links for running your panel.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='grid grid-cols-2 gap-2 lg:grid-cols-4'>
                        <Button
                            variant='outline'
                            nativeButton={false}
                            render={
                                <a
                                    href={version.data?.links.discord ?? 'https://discord.gg/pterodactyl'}
                                    target='_blank'
                                    rel='noreferrer'
                                />
                            }
                        >
                            <LifeBuoyIcon />
                            Get help (via Discord)
                        </Button>
                        <Button
                            variant='outline'
                            nativeButton={false}
                            render={<a href='https://pterodactyl.io' target='_blank' rel='noreferrer' />}
                        >
                            <BookOpenIcon />
                            Documentation
                        </Button>
                        <Button
                            variant='outline'
                            nativeButton={false}
                            render={<a href='https://github.com/pterodactyl/panel' target='_blank' rel='noreferrer' />}
                        >
                            <CodeIcon />
                            GitHub
                        </Button>
                        <Button
                            variant='outline'
                            nativeButton={false}
                            render={
                                <a
                                    href={version.data?.links.donations ?? 'https://github.com/sponsors/pterodactyl'}
                                    target='_blank'
                                    rel='noreferrer'
                                />
                            }
                        >
                            <HeartIcon />
                            Support the project
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export { OverviewPage };
