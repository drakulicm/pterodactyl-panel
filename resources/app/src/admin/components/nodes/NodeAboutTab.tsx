import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { type AdminNode, deleteNode, nodeSystemInformationQueryOptions } from '@/admin/api/nodes';
import { versionQueryOptions } from '@/admin/api/overview';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const percentage = (used: number, total: number): number => {
    if (total <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((used / total) * 100));
};

const InformationRow: React.FC<{
    label: string;
    children: React.ReactNode;
}> = ({ label, children }) => (
    <div className='flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm last:border-b-0'>
        <span className='text-muted-foreground'>{label}</span>
        <span className='text-right'>{children}</span>
    </div>
);

const ResourceMeter: React.FC<{
    label: string;
    used: number;
    total: number;
}> = ({ label, used, total }) => (
    <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>{label}</span>
            <span className='tabular-nums'>
                {used} / {total} MiB
            </span>
        </div>
        <Progress value={percentage(used, total)} />
    </div>
);

const NodeAboutTab: React.FC<{
    node: AdminNode;
}> = ({ node }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const information = useQuery(nodeSystemInformationQueryOptions(node.id));
    const version = useQuery(versionQueryOptions);
    const serverCount = node.relationships?.servers?.data?.length ?? 0;

    const remove = useMutation({
        mutationFn: () => deleteNode(node.id),
        onSuccess: async () => {
            toast.success('The node has been removed from the panel.');
            await queryClient.invalidateQueries({ queryKey: ['admin', '/nodes'] });

            return navigate({ to: '/admin/nodes' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <div className='grid items-start gap-4 lg:grid-cols-3'>
            <div className='flex flex-col gap-4 lg:col-span-2'>
                <Card className='gap-0 py-0'>
                    <CardHeader className='border-b py-4'>
                        <CardTitle>Information</CardTitle>
                        <CardDescription>Reported by the daemon running on this node.</CardDescription>
                    </CardHeader>
                    <CardContent className='px-0'>
                        {information.isPending && <Skeleton className='m-4 h-24 rounded-lg' />}
                        {information.isError && (
                            <div className='p-4'>
                                <Alert variant='destructive'>
                                    <TriangleAlertIcon />
                                    <AlertTitle>Unable to reach the daemon</AlertTitle>
                                    <AlertDescription>{httpErrorToHuman(information.error)}</AlertDescription>
                                </Alert>
                            </div>
                        )}
                        {information.data && (
                            <>
                                <InformationRow label='Daemon version'>
                                    <code className='font-mono text-xs'>{information.data.version}</code>
                                    {version.data && (
                                        <span className='text-muted-foreground'>
                                            {' '}
                                            (latest: {version.data.wings.latest})
                                        </span>
                                    )}
                                </InformationRow>
                                <InformationRow label='System information'>
                                    {information.data.system.type} ({information.data.system.arch})
                                </InformationRow>
                                <InformationRow label='Kernel'>
                                    <code className='font-mono text-xs'>{information.data.system.release}</code>
                                </InformationRow>
                                <InformationRow label='Total CPU threads'>
                                    <span className='tabular-nums'>{information.data.system.cpus}</span>
                                </InformationRow>
                            </>
                        )}
                    </CardContent>
                </Card>
                {node.description && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-sm whitespace-pre-wrap text-muted-foreground'>{node.description}</p>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Delete node</CardTitle>
                        <CardDescription>
                            Deleting a node is an irreversible action and will immediately remove this node from the
                            panel. There must be no servers associated with this node in order to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className='items-center justify-between gap-4'>
                        <p className='text-sm text-muted-foreground'>
                            {serverCount > 0
                                ? 'This node still has servers attached to it and cannot be deleted until they are removed.'
                                : ''}
                        </p>
                        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                            <AlertDialogTrigger
                                render={
                                    <Button variant='destructive' disabled={serverCount > 0 || remove.isPending} />
                                }
                            >
                                {remove.isPending && <Spinner />}
                                Yes, delete this node
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {node.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently remove the node and all of its allocations from the panel.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        variant='destructive'
                                        onClick={() => {
                                            setIsDeleteOpen(false);
                                            remove.mutate();
                                        }}
                                    >
                                        Delete node
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>At a glance</CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    {node.maintenance_mode && (
                        <Alert>
                            <TriangleAlertIcon className='text-amber-500' />
                            <AlertTitle>Under maintenance</AlertTitle>
                            <AlertDescription>
                                Users cannot access servers that are running on this node.
                            </AlertDescription>
                        </Alert>
                    )}
                    <ResourceMeter
                        label='Disk space allocated'
                        used={node.allocated_resources.disk}
                        total={node.disk}
                    />
                    <ResourceMeter
                        label='Memory allocated'
                        used={node.allocated_resources.memory}
                        total={node.memory}
                    />
                    <div className='flex items-center justify-between text-sm'>
                        <span className='text-muted-foreground'>Total servers</span>
                        <span className='tabular-nums'>{serverCount}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export { NodeAboutTab };
