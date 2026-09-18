import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createLocation } from '@/admin/api/locations';
import { locationSchema, type LocationFormValues } from '@/admin/components/locations/locationSchema';
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

const DEFAULTS: LocationFormValues = { short: '', long: '' };

const LocationCreateDialog: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: DEFAULTS,
    });

    const create = useMutation({
        mutationFn: (values: LocationFormValues) => createLocation({ short: values.short, long: values.long || null }),
        onSuccess: async (location) => {
            await queryClient.invalidateQueries({ queryKey: ['admin', '/locations'] });
            setIsOpen(false);
            form.reset(DEFAULTS);
            toast.success(`${location.short} has been created.`);
            await navigate({ to: '/admin/locations/view/$locationId', params: { locationId: String(location.id) } });
        },
    });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (!open) {
            form.reset(DEFAULTS);
            create.reset();
        }
    };

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size='sm' />}>
                <PlusIcon />
                Create new
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create location</DialogTitle>
                    <DialogDescription>Locations group the nodes that servers can be deployed to.</DialogDescription>
                </DialogHeader>
                <form id='location-create-form' onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <Field data-invalid={!!form.formState.errors.short}>
                            <FieldLabel htmlFor='location-create-short'>Short code</FieldLabel>
                            <Input
                                id='location-create-short'
                                aria-invalid={!!form.formState.errors.short}
                                {...form.register('short')}
                            />
                            <FieldDescription>
                                A short identifier used to distinguish this location from others. Must be between 1 and
                                60 characters, for example <code className='font-mono text-xs'>us.nyc.lvl3</code>.
                            </FieldDescription>
                            <FieldError errors={[form.formState.errors.short]} />
                        </Field>
                        <Field data-invalid={!!form.formState.errors.long}>
                            <FieldLabel htmlFor='location-create-long'>Description</FieldLabel>
                            <Textarea id='location-create-long' rows={4} {...form.register('long')} />
                            <FieldDescription>
                                A longer description of this location. Must be less than 191 characters.
                            </FieldDescription>
                            <FieldError errors={[form.formState.errors.long]} />
                        </Field>
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type='submit' form='location-create-form' disabled={create.isPending}>
                        {create.isPending && <Spinner />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { LocationCreateDialog };
