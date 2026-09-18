import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { type AdminServer, formatAllocation, getServerAllocations } from '@/admin/api/servers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const NotSet: React.FC = () => <Badge variant='secondary'>Not set</Badge>;

const Row: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <TableRow>
        <TableCell className='w-64 text-muted-foreground'>{label}</TableCell>
        <TableCell>{children}</TableCell>
    </TableRow>
);

const Mono: React.FC<{ children: ReactNode }> = ({ children }) => (
    <code className='rounded bg-muted px-1 font-mono text-xs'>{children}</code>
);

const ServerAboutTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const allocations = getServerAllocations(server);
    const primary = allocations.find((allocation) => allocation.id === server.allocation);
    const user = server.relationships?.user?.attributes;
    const node = server.relationships?.node?.attributes;
    const nest = server.relationships?.nest?.attributes;
    const egg = server.relationships?.egg?.attributes;

    return (
        <div className='grid gap-4 lg:grid-cols-3'>
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                    <Table>
                        <TableBody>
                            <Row label='Internal identifier'>
                                <Mono>{server.id}</Mono>
                            </Row>
                            <Row label='External identifier'>
                                {server.external_id ? <Mono>{server.external_id}</Mono> : <NotSet />}
                            </Row>
                            <Row label='UUID / Docker container ID'>
                                <Mono>{server.uuid}</Mono>
                            </Row>
                            <Row label='Short identifier'>
                                <Mono>{server.identifier}</Mono>
                            </Row>
                            <Row label='Current egg'>
                                {nest && egg ? (
                                    <span className='flex items-center gap-1'>
                                        <Link
                                            to='/admin/nests/view/$nestId'
                                            params={{ nestId: String(nest.id) }}
                                            className='text-primary hover:underline'
                                        >
                                            {nest.name}
                                        </Link>
                                        <span className='text-muted-foreground'>::</span>
                                        <Link
                                            to='/admin/nests/egg/$eggId'
                                            params={{ eggId: String(egg.id) }}
                                            className='text-primary hover:underline'
                                        >
                                            {egg.name}
                                        </Link>
                                    </span>
                                ) : (
                                    <NotSet />
                                )}
                            </Row>
                            <Row label='Server name'>{server.name}</Row>
                            <Row label='Docker image'>
                                <Mono>{server.container.image}</Mono>
                            </Row>
                            <Row label='CPU limit'>
                                <Mono>{server.limits.cpu === 0 ? 'Unlimited' : `${server.limits.cpu}%`}</Mono>
                            </Row>
                            <Row label='CPU pinning'>
                                {server.limits.threads ? <Mono>{server.limits.threads}</Mono> : <NotSet />}
                            </Row>
                            <Row label='Memory'>
                                <span className='flex items-center gap-1'>
                                    <Mono>{server.limits.memory === 0 ? 'Unlimited' : `${server.limits.memory}MiB`}</Mono>
                                    <span className='text-muted-foreground'>/</span>
                                    <Mono>
                                        {server.limits.swap === 0
                                            ? 'Not set'
                                            : server.limits.swap === -1
                                              ? 'Unlimited'
                                              : `${server.limits.swap}MiB`}
                                    </Mono>
                                    <span className='text-xs text-muted-foreground'>swap space</span>
                                </span>
                            </Row>
                            <Row label='Disk space'>
                                <Mono>{server.limits.disk === 0 ? 'Unlimited' : `${server.limits.disk}MiB`}</Mono>
                            </Row>
                            <Row label='Block IO weight'>
                                <Mono>{server.limits.io}</Mono>
                            </Row>
                            <Row label='OOM killer'>
                                <Badge variant={server.limits.oom_disabled ? 'secondary' : 'destructive'}>
                                    {server.limits.oom_disabled ? 'Disabled' : 'Enabled'}
                                </Badge>
                            </Row>
                            <Row label='Feature limits'>
                                <span className='flex flex-wrap gap-2 text-xs'>
                                    <Badge variant='outline'>
                                        Databases: {server.feature_limits.databases ?? 'Unlimited'}
                                    </Badge>
                                    <Badge variant='outline'>
                                        Allocations: {server.feature_limits.allocations ?? 'Unlimited'}
                                    </Badge>
                                    <Badge variant='outline'>
                                        Backups: {server.feature_limits.backups ?? 'Unlimited'}
                                    </Badge>
                                </span>
                            </Row>
                            <Row label='Default connection'>
                                {primary ? <Mono>{`${primary.ip}:${primary.port}`}</Mono> : <NotSet />}
                            </Row>
                            <Row label='Connection alias'>
                                {primary && primary.alias && primary.alias !== primary.ip ? (
                                    <Mono>{formatAllocation(primary)}</Mono>
                                ) : (
                                    <Badge variant='secondary'>No alias assigned</Badge>
                                )}
                            </Row>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <div className='flex flex-col gap-4'>
                <Card>
                    <CardHeader>
                        <CardDescription>Status</CardDescription>
                        <CardTitle>
                            {server.suspended
                                ? 'Suspended'
                                : server.status === 'install_failed' || server.status === 'reinstall_failed'
                                  ? 'Install failed'
                                  : server.container.installed === 0
                                    ? 'Installing'
                                    : server.status === 'restoring_backup'
                                      ? 'Restoring backup'
                                      : 'Active'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Server owner</CardDescription>
                        <CardTitle>{user ? user.username : '—'}</CardTitle>
                    </CardHeader>
                    {user && (
                        <CardContent>
                            <Link
                                to='/admin/users/view/$userId'
                                params={{ userId: String(user.id) }}
                                className='text-sm text-primary hover:underline'
                            >
                                More info
                            </Link>
                        </CardContent>
                    )}
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Server node</CardDescription>
                        <CardTitle>{node ? node.name : '—'}</CardTitle>
                    </CardHeader>
                    {node && (
                        <CardContent>
                            <Link
                                to='/admin/nodes/view/$nodeId'
                                params={{ nodeId: String(node.id) }}
                                className='text-sm text-primary hover:underline'
                            >
                                More info
                            </Link>
                        </CardContent>
                    )}
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Assigned allocations</CardDescription>
                        <CardTitle>{allocations.length}</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-wrap gap-2'>
                        {allocations.map((allocation) => (
                            <Mono key={allocation.id}>{formatAllocation(allocation)}</Mono>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export { ServerAboutTab };
