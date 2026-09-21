import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import type { AdminMountPayload } from '@/admin/api/mounts';
import { MountFields, mountSchema, type MountFormValues } from '@/admin/components/mounts/MountFields';
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
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const EMPTY_MOUNT: MountFormValues = {
    name: '',
    description: '',
    source: '',
    target: '',
    read_only: false,
    user_mountable: false,
};

const MountFormDialog: React.FC<{
    trigger: ReactElement;
    isOpen: boolean;
    isPending: boolean;
    error: unknown;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (payload: AdminMountPayload) => void;
}> = ({ trigger, isOpen, isPending, error, onOpenChange, onSubmit }) => {
    const form = useForm({ resolver: zodResolver(mountSchema), defaultValues: EMPTY_MOUNT });

    const handleSubmit = form.handleSubmit((values) =>
        onSubmit({ ...values, description: values.description.trim() || null }),
    );

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(EMPTY_MOUNT);
        }

        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-xl'>
                <form onSubmit={handleSubmit} noValidate>
                    <DialogHeader>
                        <DialogTitle>Create mount</DialogTitle>
                        <DialogDescription>
                            Configure an additional mount point that can be attached to servers.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='py-4'>
                        <FormError message={error ? httpErrorToHuman(error) : null} />
                        <MountFields form={form} idPrefix='new-mount' />
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={isPending}>
                            {isPending && <Spinner />}
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { MountFormDialog };
