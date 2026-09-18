import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRoundIcon } from 'lucide-react';
import { stringify } from 'yaml';

import { createNodeDeployToken, nodeConfigurationQueryOptions } from '@/admin/api/nodes';
import { NodeCodeBlock } from '@/admin/components/nodes/NodeCodeBlock';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const NodeConfigurationTab: React.FC<{
    nodeId: number;
}> = ({ nodeId }) => {
    const configuration = useQuery(nodeConfigurationQueryOptions(nodeId));

    const token = useMutation({
        mutationFn: () => createNodeDeployToken(nodeId),
    });

    const deployCommand = token.data
        ? [
              'cd /etc/pterodactyl && sudo wings configure',
              `--panel-url ${window.location.origin}`,
              `--token ${token.data.token}`,
              `--node ${token.data.node}`,
              window.location.protocol === 'http:' ? '--allow-insecure' : '',
          ]
              .filter(Boolean)
              .join(' ')
        : null;

    return (
        <div className='grid items-start gap-4 lg:grid-cols-3'>
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardTitle>Configuration file</CardTitle>
                    <CardDescription>
                        This file should be placed in your daemon&apos;s root directory (usually{' '}
                        <code className='font-mono text-xs'>/etc/pterodactyl</code>) in a file called{' '}
                        <code className='font-mono text-xs'>config.yml</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormError message={configuration.error ? httpErrorToHuman(configuration.error) : null} />
                    {configuration.isPending && <Skeleton className='h-80 rounded-lg' />}
                    {configuration.data && (
                        <NodeCodeBlock
                            value={stringify(configuration.data)}
                            label='Copy the daemon configuration file'
                        />
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Auto-deploy</CardTitle>
                    <CardDescription>
                        Use the button below to generate a custom deployment command that can be used to configure wings
                        on the target server with a single command.
                    </CardDescription>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    <FormError message={token.error ? httpErrorToHuman(token.error) : null} />
                    {deployCommand && (
                        <NodeCodeBlock value={deployCommand} label='Copy the auto-deploy command' />
                    )}
                </CardContent>
                <CardFooter>
                    <Button variant='outline' className='w-full' disabled={token.isPending} onClick={() => token.mutate()}>
                        {token.isPending ? <Spinner /> : <KeyRoundIcon />}
                        Generate token
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export { NodeConfigurationTab };
