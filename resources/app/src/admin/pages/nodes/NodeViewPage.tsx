import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';

import { nodeQueryOptions } from '@/admin/api/nodes';
import { NodeAboutTab } from '@/admin/components/nodes/NodeAboutTab';
import { NodeAllocationsTab } from '@/admin/components/nodes/NodeAllocationsTab';
import { NodeConfigurationTab } from '@/admin/components/nodes/NodeConfigurationTab';
import { NodeForm } from '@/admin/components/nodes/NodeForm';
import { NodeServersTab } from '@/admin/components/nodes/NodeServersTab';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { httpErrorToHuman } from '@/lib/http';

const TABS = [
    { value: 'about', label: 'About' },
    { value: 'settings', label: 'Settings' },
    { value: 'configuration', label: 'Configuration' },
    { value: 'allocation', label: 'Allocation' },
    { value: 'servers', label: 'Servers' },
] as const;

type NodeTab = (typeof TABS)[number]['value'];

const NodeViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { nodeId } = useParams({ from: '/admin/nodes/view/$nodeId' });
    const { tab } = useSearch({ from: '/admin/nodes/view/$nodeId' });
    const node = useQuery(nodeQueryOptions(Number(nodeId)));
    const activeTab: NodeTab = tab ?? 'about';

    const handleTabChange = (value: unknown) =>
        navigate({
            to: '/admin/nodes/view/$nodeId',
            params: { nodeId },
            search: { tab: value as NodeTab },
        });

    return (
        <>
            <PageHeader title={node.data?.name ?? 'Node'}>
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/nodes' />}>
                    <ArrowLeftIcon />
                    Back to nodes
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 p-4'>
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList variant='line'>
                        {TABS.map((item) => (
                            <TabsTrigger key={item.value} value={item.value}>
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <FormError message={node.error ? httpErrorToHuman(node.error) : null} />
                {node.isPending && <Skeleton className='h-96 rounded-xl' />}
                {node.data && (
                    <>
                        {activeTab === 'about' && <NodeAboutTab node={node.data} />}
                        {activeTab === 'settings' && <NodeForm node={node.data} />}
                        {activeTab === 'configuration' && <NodeConfigurationTab nodeId={node.data.id} />}
                        {activeTab === 'allocation' && <NodeAllocationsTab nodeId={node.data.id} />}
                        {activeTab === 'servers' && <NodeServersTab nodeId={node.data.id} />}
                    </>
                )}
            </div>
        </>
    );
};

export { NodeViewPage };
