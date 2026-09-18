import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AdminNestPayload } from '@/admin/api/nests';
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const nestSchema = z.object({
    name: z
        .string()
        .min(1, 'A nest name is required.')
        .max(191, 'The name may not be greater than 191 characters.')
        .regex(/^[\w\- ]+$/, 'The name may only contain letters, numbers, dashes, underscores and spaces.'),
    description: z.string(),
});

type NestFormValues = z.infer<typeof nestSchema>;

const NestFormDialog: React.FC<{
    trigger: ReactElement;
    isOpen: boolean;
    isPending: boolean;
    error: unknown;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (payload: AdminNestPayload) => void;
}> = ({ trigger, isOpen, isPending, error, onOpenChange, onSubmit }) => {
    const form = useForm<NestFormValues>({
        resolver: zodResolver(nestSchema),
        defaultValues: { name: '', description: '' },
    });
    const { errors } = form.formState;

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset({ name: '', description: '' });
        }

        onOpenChange(open);
    };

    const handleSubmit = form.handleSubmit((values) =>
        onSubmit({ name: values.name, description: values.description.trim() || null }),
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-lg'>
                <form onSubmit={handleSubmit} noValidate>
                    <DialogHeader>
                        <DialogTitle>New nest</DialogTitle>
                        <DialogDescription>Configure a new nest to deploy to all nodes.</DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='py-4'>
                        <FormError message={error ? httpErrorToHuman(error) : null} />
                        <Field data-invalid={!!errors.name}>
                            <FieldLabel htmlFor='nest-name'>Name</FieldLabel>
                            <Input id='nest-name' aria-invalid={!!errors.name} {...form.register('name')} />
                            <FieldDescription>
                                This should be a descriptive category name that encompasses all of the eggs within the
                                nest.
                            </FieldDescription>
                            <FieldError errors={[errors.name]} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='nest-description'>Description</FieldLabel>
                            <Textarea id='nest-description' rows={5} {...form.register('description')} />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={isPending}>
                            {isPending && <Spinner />}
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { NestFormDialog };
