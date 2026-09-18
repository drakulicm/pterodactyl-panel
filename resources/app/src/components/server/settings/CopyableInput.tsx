import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

const CopyableInput: React.FC<{
    id: string;
    value: string;
}> = ({ id, value }) => {
    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        toast.success('Copied to clipboard.');
    };

    return (
        <InputGroup>
            <InputGroupInput id={id} value={value} readOnly className='font-mono' />
            <InputGroupAddon align='inline-end'>
                <InputGroupButton size='icon-xs' aria-label='Copy' onClick={handleCopy}>
                    <CopyIcon />
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
};

export { CopyableInput };
