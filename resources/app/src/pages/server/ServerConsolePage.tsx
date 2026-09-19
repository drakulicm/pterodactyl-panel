import { PageHeader } from '@/components/layout/PageHeader';
import { PowerButtons } from '@/components/server/PowerButtons';
import { ServerConsole } from '@/components/server/ServerConsole';
import { ServerStats } from '@/components/server/ServerStats';
import { StatGraphs } from '@/components/server/StatGraphs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useServer } from '@/hooks/useServer';
import { hasAnyPermission } from '@/lib/permissions';

const ServerConsolePage: React.FC = () => {
    const { server, permissions } = useServer();
    const hasPowerControls = hasAnyPermission(permissions, ['control.start', 'control.stop', 'control.restart']);

    return (
        <>
            <PageHeader title={server.name}>{hasPowerControls && <PowerButtons />}</PageHeader>
            <div className='flex min-h-0 flex-1 flex-col gap-4 p-4'>
                {(server.isNodeUnderMaintenance || server.status === 'installing' || server.isTransferring) && (
                    <Alert>
                        <AlertDescription>
                            {server.isNodeUnderMaintenance
                                ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                                : server.status === 'installing'
                                  ? 'This server is currently running its installation process and most actions are unavailable.'
                                  : 'This server is currently being transferred to another node and all actions are unavailable.'}
                        </AlertDescription>
                    </Alert>
                )}
                <div className='flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row'>
                    <div className='flex h-[55svh] min-h-96 min-w-0 flex-col lg:h-auto lg:min-h-0 lg:flex-1'>
                        <ServerConsole />
                    </div>
                    <div className='w-full shrink-0 lg:w-64'>
                        <ServerStats />
                    </div>
                </div>
                <StatGraphs />
            </div>
        </>
    );
};

export { ServerConsolePage };
