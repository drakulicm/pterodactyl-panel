import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServer } from '@/hooks/useServer';

const DebugInfoCard: React.FC = () => {
    const { server } = useServer();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(server.uuid);
        toast.success('Server ID copied to clipboard.');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Debug information</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-2 text-sm'>
                <div className='flex items-center justify-between gap-4'>
                    <span>Node</span>
                    <code className='rounded-md bg-muted px-2 py-1 font-mono text-xs'>{server.node}</code>
                </div>
                <div className='flex items-center justify-between gap-4'>
                    <span>Server ID</span>
                    <div className='flex min-w-0 items-center gap-1'>
                        <code className='truncate rounded-md bg-muted px-2 py-1 font-mono text-xs'>{server.uuid}</code>
                        <Button variant='ghost' size='icon-xs' aria-label='Copy server ID' onClick={handleCopy}>
                            <CopyIcon />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export { DebugInfoCard };
