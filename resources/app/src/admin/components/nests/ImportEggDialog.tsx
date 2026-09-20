import type { ReactElement } from 'react';
import { useState } from 'react';

import type { AdminNest, EggImportSource } from '@/admin/api/nests';
import { EggSourceFields } from '@/admin/components/nests/EggSourceFields';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const ImportEggDialog: React.FC<{
    trigger: ReactElement;
    nests: AdminNest[];
    isOpen: boolean;
    isPending: boolean;
    error: unknown;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (nestId: number, source: EggImportSource) => void;
}> = ({ trigger, nests, isOpen, isPending, error, onOpenChange, onSubmit }) => {
    const [source, setSource] = useState<EggImportSource | null>(null);
    const [nestId, setNestId] = useState<string>('');

    const nestItems = nests.map((nest) => ({ value: String(nest.id), label: `${nest.name} <${nest.author}>` }));

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSource(null);
            setNestId('');
        }

        onOpenChange(open);
    };

    const handleSubmit = () => {
        if (!source || !nestId) {
            return;
        }

        onSubmit(Number(nestId), source);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Import an egg</DialogTitle>
                    <DialogDescription>
                        Add an exported egg to one of your nests from a link or from a file on your computer.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup className='py-4'>
                    <FormError message={error ? httpErrorToHuman(error) : null} />
                    <EggSourceFields idPrefix='import-egg' onChange={setSource} />
                    <Field>
                        <FieldLabel htmlFor='import-egg-nest'>Associated nest</FieldLabel>
                        <Select
                            items={nestItems}
                            value={nestId}
                            onValueChange={(value) => value && setNestId(String(value))}
                        >
                            <SelectTrigger id='import-egg-nest' className='w-full'>
                                <SelectValue placeholder='Select a nest' />
                            </SelectTrigger>
                            <SelectContent>
                                {nestItems.map((nest) => (
                                    <SelectItem key={nest.value} value={nest.value}>
                                        {nest.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            Select the nest that this egg will be associated with. If you wish to associate it with a
                            new nest you will need to create that nest before continuing.
                        </FieldDescription>
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <Button variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={!source || !nestId || isPending} onClick={handleSubmit}>
                        {isPending && <Spinner />}
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { ImportEggDialog };
