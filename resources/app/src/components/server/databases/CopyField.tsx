import { CopyIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

const CopyField: React.FC<{
    id: string;
    label: string;
    value: string;
    isSecret?: boolean;
    canCopy?: boolean;
}> = ({ id, label, value, isSecret = false, canCopy = true }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied to clipboard.`);
        } catch {
            toast.error('Unable to copy to the clipboard.');
        }
    };

    const handleToggle = () => setIsRevealed((current) => !current);

    return (
        <Field>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputGroup>
                <InputGroupInput
                    id={id}
                    readOnly
                    type={isSecret && !isRevealed ? 'password' : 'text'}
                    value={value}
                    className='font-mono text-xs'
                />
                <InputGroupAddon align='inline-end'>
                    {isSecret && (
                        <InputGroupButton
                            size='icon-xs'
                            aria-label={isRevealed ? `Hide ${label}` : `Show ${label}`}
                            onClick={handleToggle}
                        >
                            {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                        </InputGroupButton>
                    )}
                    {canCopy && (
                        <InputGroupButton size='icon-xs' aria-label={`Copy ${label}`} onClick={handleCopy}>
                            <CopyIcon />
                        </InputGroupButton>
                    )}
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
};

export { CopyField };
