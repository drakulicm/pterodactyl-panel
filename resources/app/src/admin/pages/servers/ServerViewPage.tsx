import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import { type AdminServer, serverQueryOptions } from '@/admin/api/servers';
import { ServerAboutTab } from '@/admin/components/servers/ServerAboutTab';
import { ServerBuildTab } from '@/admin/components/servers/ServerBuildTab';
import { ServerDatabaseTab } from '@/admin/components/servers/ServerDatabaseTab';
import { ServerDeleteTab } from '@/admin/components/servers/ServerDeleteTab';
import { ServerDetailsTab } from '@/admin/components/servers/ServerDetailsTab';
import { ServerManageTab } from '@/admin/components/servers/ServerManageTab';
import { ServerMountsTab } from '@/admin/components/servers/ServerMountsTab';
import { ServerStartupTab } from '@/admin/components/servers/ServerStartupTab';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { httpErrorToHuman } from '@/lib/http';

type ServerTab = 'about' | 'details' | 'build' | 'startup' | 'database' | 'mounts' | 'manage' | 'delete';

const ALL_TABS: { value: ServerTab; label: string; requiresInstalled: boolean }[] = [
    { value: 'about', label: 'About', requiresInstalled: false },
    { value: 'details', label: 'Details', requiresInstalled: true },
    { value: 'build', label: 'Build configuration', requiresInstalled: true },
    { value: 'startup', label: 'Startup', requiresInstalled: true },
    { value: 'database', label: 'Database', requiresInstalled: true },
    { value: 'mounts', label: 'Mounts', requiresInstalled: true },
    { value: 'manage', label: 'Manage', requiresInstalled: false },
    { value: 'delete', label: 'Delete', requiresInstalled: false },
];

const ServerTabContent: React.FC<{ tab: ServerTab; server: AdminServer }> = ({ tab, server }) => {
    if (tab === 'details') {
        return <ServerDetailsTab server={server} />;
    }

    if (tab === 'build') {
        return <ServerBuildTab server={server} />;
    }

    if (tab === 'startup') {
        return <ServerStartupTab server={server} />;
    }

    if (tab === 'database') {
        return <ServerDatabaseTab server={server} />;
    }

    if (tab === 'mounts') {
        return <ServerMountsTab server={server} />;
    }

    if (tab === 'manage') {
        return <ServerManageTab server={server} />;
    }

    if (tab === 'delete') {
        return <ServerDeleteTab server={server} />;
    }

    return <ServerAboutTab server={server} />;
};

const ServerViewPage: React.FC = () => {
    const { serverId } = useParams({ from: '/admin/servers/view/$serverId' });
    const { tab } = useSearch({ from: '/admin/servers/view/$serverId' });
    const navigate = useNavigate();

    const query = useQuery(serverQueryOptions(Number(serverId)));
    const server = query.data;

    const isInstalled = server ? server.container.installed === 1 : false;
    const tabs = ALL_TABS.filter((item) => !item.requiresInstalled || isInstalled);
    const activeTab = tabs.some((item) => item.value === tab) ? tab : 'about';

    return (
        <>
            <PageHeader title={server ? server.name : 'Server'}>
                {server && (
                    <>
                        {server.suspended && <Badge variant='destructive'>Suspended</Badge>}
                        {!isInstalled && <Badge variant='secondary'>Installing</Badge>}
                        <Button
                            variant='outline'
                            size='sm'
                            nativeButton={false}
                            render={
                                <a href={`/server/${server.identifier}`} target='_blank' rel='noreferrer' />
                            }
                        >
                            <ExternalLinkIcon />
                            Client view
                        </Button>
                    </>
                )}
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/servers' />}>
                    Back to servers
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={query.error ? httpErrorToHuman(query.error) : null} />
                {query.isPending && <Skeleton className='h-96 rounded-xl' />}
                {server && (
                    <>
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) =>
                                navigate({
                                    to: '/admin/servers/view/$serverId',
                                    params: { serverId },
                                    search: { tab: value as ServerTab },
                                })
                            }
                        >
                            <TabsList variant='line' className='flex-wrap'>
                                {tabs.map((item) => (
                                    <TabsTrigger key={item.value} value={item.value}>
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        <ServerTabContent tab={activeTab} server={server} />
                    </>
                )}
            </div>
        </>
    );
};

export { ServerViewPage };
export type { ServerTab };
