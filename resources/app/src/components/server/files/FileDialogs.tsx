import { useEffect, useState } from 'react';

import type { FileObject } from '@/api/server/files';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { joinPath } from '@/lib/paths';

type FileDialogState =
    | { type: 'rename' | 'move'; file: FileObject }
    | { type: 'chmod'; file: FileObject }
    | { type: 'delete'; names: string[] }
    | { type: 'mass-move'; names: string[] }
    | { type: 'new-directory' }
    | { type: 'pull' }
    | null;

const InputDialog: React.FC<{
    isOpen: boolean;
    title: string;
    description?: string;
    label: string;
    initialValue: string;
    hint?: (value: string) => string | undefined;
    submitLabel: string;
    isPending: boolean;
    secondaryLabel?: string;
    onSubmit: (value: string, secondary: string) => void;
    onClose: () => void;
}> = ({
    isOpen,
    title,
    description,
    label,
    initialValue,
    hint,
    submitLabel,
    isPending,
    secondaryLabel,
    onSubmit,
    onClose,
}) => {
    const [value, setValue] = useState(initialValue);
    const [secondary, setSecondary] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setSecondary('');
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (value.trim().length === 0) {
            return;
        }

        onSubmit(value.trim(), secondary.trim());
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false}>
                <form onSubmit={handleSubmit} className='contents'>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='file-dialog-input'>{label}</FieldLabel>
                            <Input
                                id='file-dialog-input'
                                autoFocus
                                autoComplete='off'
                                spellCheck={false}
                                value={value}
                                onChange={(event) => setValue(event.target.value)}
                            />
                            {hint?.(value) && <FieldDescription className='break-all'>{hint(value)}</FieldDescription>}
                        </Field>
                        {secondaryLabel && (
                            <Field>
                                <FieldLabel htmlFor='file-dialog-secondary'>{secondaryLabel}</FieldLabel>
                                <Input
                                    id='file-dialog-secondary'
                                    autoComplete='off'
                                    spellCheck={false}
                                    value={secondary}
                                    onChange={(event) => setSecondary(event.target.value)}
                                />
                            </Field>
                        )}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={isPending || value.trim().length === 0}>
                            {isPending && <Spinner />}
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const DeleteFilesDialog: React.FC<{
    names: string[];
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
}> = ({ names, isOpen, onConfirm, onClose }) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{names.length === 1 ? 'Delete file' : `Delete ${names.length} files`}</AlertDialogTitle>
                    <AlertDialogDescription className='break-all'>
                        {names.length === 1
                            ? `You will not be able to recover the contents of ${names[0]} once deleted.`
                            : `This is a permanent action: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} others` : ''}.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant='destructive' onClick={onConfirm}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const moveHint = (directory: string) => (value: string) => `New location: /home/container${joinPath(directory, value)}`;

export { DeleteFilesDialog, InputDialog, moveHint };
export type { FileDialogState };
