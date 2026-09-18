import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { adminApiKeyResourcesQueryOptions, createAdminApiKey, type CreateAdminApiKeyBody } from '@/admin/api/apiKeys';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const LEVELS = [
    { value: '0', label: 'None' },
    { value: '1', label: 'Read' },
    { value: '3', label: 'Read & Write' },
] as const;

const schema = z.object({
    memo: z.string().min(1, 'A description is required.').max(500, 'The description may not exceed 500 characters.'),
});

const humanizeResource = (resource: string): string =>
    resource
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const ApiKeyCreateDialog: React.FC<{
    onCreated: (token: string) => void;
}> = ({ onCreated }) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [permissions, setPermissions] = useState<Record<string, string>>({});
    const resources = useQuery(adminApiKeyResourcesQueryOptions);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { memo: '' },
    });

    const create = useMutation({
        mutationFn: createAdminApiKey,
        onSuccess: async ({ secretToken }) => {
            await queryClient.invalidateQueries({ queryKey: ['admin', '/api-keys'] });
            setIsOpen(false);
            form.reset();
            setPermissions({});
            onCreated(secretToken);
        },
    });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (!open) {
            form.reset();
            setPermissions({});
            create.reset();
        }
    };

    const handleBulkSet = (value: string) =>
        setPermissions(Object.fromEntries((resources.data?.resources ?? []).map((resource) => [resource, value])));

    const handleSubmit = form.handleSubmit((values) => {
        const body = (resources.data?.resources ?? []).reduce<CreateAdminApiKeyBody>(
            (result, resource) => ({ ...result, [`r_${resource}`]: Number(permissions[resource] ?? '0') }),
            { memo: values.memo },
        );

        create.mutate(body);
    });

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size='sm' />}>
                <PlusIcon />
                Create new
            </DialogTrigger>
            <DialogContent className='sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Create application API key</DialogTitle>
                    <DialogDescription>
                        Once you have assigned permissions and created this set of credentials you will be unable to
                        come back and edit it. If you need to make changes down the road you will need to create a new
                        set of credentials.
                    </DialogDescription>
                </DialogHeader>
                <form id='api-key-create-form' onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <Field data-invalid={!!form.formState.errors.memo}>
                            <FieldLabel htmlFor='api-key-memo'>Description</FieldLabel>
                            <Input
                                id='api-key-memo'
                                aria-invalid={!!form.formState.errors.memo}
                                {...form.register('memo')}
                            />
                            <FieldDescription>
                                A short note describing what this set of credentials is used for.
                            </FieldDescription>
                            <FieldError errors={[form.formState.errors.memo]} />
                        </Field>
                        <Field>
                            <FieldLabel>Permissions</FieldLabel>
                            {resources.isPending ? (
                                <Skeleton className='h-64 rounded-xl' />
                            ) : (
                                <div className='flex max-h-72 flex-col divide-y overflow-auto rounded-xl border'>
                                    {(resources.data?.resources ?? []).map((resource) => (
                                        <div
                                            key={resource}
                                            className='flex flex-wrap items-center justify-between gap-3 px-3 py-2'
                                        >
                                            <span className='text-sm font-medium'>{humanizeResource(resource)}</span>
                                            <RadioGroup
                                                className='flex w-auto items-center gap-4'
                                                aria-label={`${humanizeResource(resource)} permission`}
                                                value={permissions[resource] ?? '0'}
                                                onValueChange={(value) =>
                                                    setPermissions((current) => ({
                                                        ...current,
                                                        [resource]: String(value),
                                                    }))
                                                }
                                            >
                                                {LEVELS.map((level) => (
                                                    <label
                                                        key={level.value}
                                                        className='flex items-center gap-2 text-sm text-muted-foreground'
                                                    >
                                                        <RadioGroupItem value={level.value} />
                                                        {level.label}
                                                    </label>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <FieldDescription className='flex flex-wrap items-center gap-2'>
                                Set every resource to
                                {LEVELS.map((level) => (
                                    <Button
                                        key={level.value}
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleBulkSet(level.value)}
                                    >
                                        {level.label}
                                    </Button>
                                ))}
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type='submit' form='api-key-create-form' disabled={create.isPending}>
                        {create.isPending && <Spinner />}
                        Create credentials
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { ApiKeyCreateDialog };
