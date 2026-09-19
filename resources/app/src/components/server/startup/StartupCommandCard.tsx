import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StartupCommandCard: React.FC<{
    invocation: string;
}> = ({ invocation }) => {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(invocation);
            toast.success('Startup command copied to clipboard.');
        } catch {
            toast.error('Unable to copy to the clipboard.');
        }
    };

    return (
        <Card className='lg:col-span-2'>
            <CardHeader>
                <CardTitle className='flex items-center justify-between gap-2'>
                    Startup command
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Copy startup command'
                        onClick={handleCopy}
                    >
                        <CopyIcon />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <code className='block rounded-lg bg-muted p-3 font-mono text-sm break-words'>{invocation}</code>
            </CardContent>
        </Card>
    );
};

export { StartupCommandCard };
