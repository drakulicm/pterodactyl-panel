import { useQuery } from '@tanstack/react-query';
import { VariableIcon } from 'lucide-react';

import { serverStartupQueryOptions } from '@/api/server/startup';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { DockerImageCard } from '@/components/server/startup/DockerImageCard';
import { StartupCommandCard } from '@/components/server/startup/StartupCommandCard';
import { VariableCard } from '@/components/server/startup/VariableCard';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const ServerStartupPage: React.FC = () => {
    const { server } = useServer();
    const { data, error, isPending } = useQuery(serverStartupQueryOptions(server.uuid));

    return (
        <>
            <PageHeader title='Startup' />
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                {isPending && <Skeleton className='h-64 rounded-xl' />}
                {data && (
                    <>
                        <div className='grid items-start gap-4 lg:grid-cols-3'>
                            <StartupCommandCard invocation={data.invocation} />
                            <DockerImageCard dockerImages={data.dockerImages} />
                        </div>
                        <h2 className='mt-2 text-lg font-medium'>Variables</h2>
                        {data.variables.length ? (
                            <div className='grid items-start gap-4 md:grid-cols-2'>
                                {data.variables.map((variable) => (
                                    <VariableCard key={variable.envVariable} variable={variable} />
                                ))}
                            </div>
                        ) : (
                            <Empty className='border'>
                                <EmptyHeader>
                                    <EmptyMedia variant='icon'>
                                        <VariableIcon />
                                    </EmptyMedia>
                                    <EmptyTitle>No variables</EmptyTitle>
                                    <EmptyDescription>This server has no startup variables.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export { ServerStartupPage };
