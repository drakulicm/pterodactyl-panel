import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NodeCodeBlock: React.FC<{
    value: string;
    label: string;
    className?: string;
}> = ({ value, label, className }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error('Your browser blocked access to the clipboard.');
        }
    };

    return (
        <div className={cn('relative', className)}>
            <pre className='max-h-[32rem] overflow-auto rounded-lg border bg-muted/40 p-4 pr-12 font-mono text-xs leading-relaxed whitespace-pre'>
                {value}
            </pre>
            <Button
                variant='ghost'
                size='icon-sm'
                aria-label={label}
                className='absolute top-2 right-2'
                onClick={handleCopy}
            >
                {isCopied ? <CheckIcon className='text-emerald-500' /> : <CopyIcon />}
            </Button>
        </div>
    );
};

export { NodeCodeBlock };
