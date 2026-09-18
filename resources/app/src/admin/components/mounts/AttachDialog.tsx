import type { ReactElement } from 'react';
import { useState } from 'react';

import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

interface AttachOption {
    id: number;
    label: string;
    hint?: string;
    group: string;
}

const AttachDialog: React.FC<{
    title: string;
    description: string;
    emptyLabel: string;
    trigger: ReactElement;
    options: AttachOption[];
    isOpen: boolean;
    isPending: boolean;
    error: unknown;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (ids: number[]) => void;
}> = ({ title, description, emptyLabel, trigger, options, isOpen, isPending, error, onOpenChange, onSubmit }) => {
    const [selected, setSelected] = useState<number[]>([]);

    const groups = options.reduce<Record<string, AttachOption[]>>((result, option) => {
        return { ...result, [option.group]: [...(result[option.group] ?? []), option] };
    }, {});

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelected([]);
        }

        onOpenChange(open);
    };

    const handleToggle = (id: number, isChecked: boolean) =>
        setSelected((current) => (isChecked ? [...current, id] : current.filter((value) => value !== id)));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className='flex max-h-80 flex-col gap-4 overflow-y-auto py-4'>
                    <FormError message={error ? httpErrorToHuman(error) : null} />
                    {options.length === 0 && <p className='text-sm text-muted-foreground'>{emptyLabel}</p>}
                    {Object.entries(groups).map(([group, groupOptions]) => (
                        <div key={group} className='flex flex-col gap-2'>
                            <p className='text-xs font-medium text-muted-foreground uppercase'>{group}</p>
                            {groupOptions.map((option) => (
                                <label key={option.id} className='flex items-center gap-2 text-sm'>
                                    <Checkbox
                                        checked={selected.includes(option.id)}
                                        onCheckedChange={(isChecked) => handleToggle(option.id, isChecked === true)}
                                    />
                                    <span>{option.label}</span>
                                    {option.hint && (
                                        <code className='font-mono text-xs text-muted-foreground'>{option.hint}</code>
                                    )}
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={selected.length === 0 || isPending} onClick={() => onSubmit(selected)}>
                        {isPending && <Spinner />}
                        Add
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { AttachDialog };
export type { AttachOption };
