import type { ReactElement } from 'react';
import { useState } from 'react';

import type { AdminNest } from '@/admin/api/nests';
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
import { Input } from '@/components/ui/input';
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
    onSubmit: (nestId: number, file: File) => void;
}> = ({ trigger, nests, isOpen, isPending, error, onOpenChange, onSubmit }) => {
    const [file, setFile] = useState<File | null>(null);
    const [nestId, setNestId] = useState<string>('');

    const nestItems = nests.map((nest) => ({ value: String(nest.id), label: `${nest.name} <${nest.author}>` }));

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setFile(null);
            setNestId('');
        }

        onOpenChange(open);
    };

    const handleSubmit = () => {
        if (!file || !nestId) {
            return;
        }

        onSubmit(Number(nestId), file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Import an egg</DialogTitle>
                    <DialogDescription>
                        Upload an exported egg document to add it to one of your nests.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup className='py-4'>
                    <FormError message={error ? httpErrorToHuman(error) : null} />
                    <Field>
                        <FieldLabel htmlFor='import-egg-file'>Egg file</FieldLabel>
                        <Input
                            id='import-egg-file'
                            type='file'
                            accept='application/json'
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        />
                        <FieldDescription>
                            Select the .json file for the new egg that you wish to import.
                        </FieldDescription>
                    </Field>
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
                    <Button disabled={!file || !nestId || isPending} onClick={handleSubmit}>
                        {isPending && <Spinner />}
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { ImportEggDialog };
