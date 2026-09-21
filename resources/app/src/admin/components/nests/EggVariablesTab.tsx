import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminEggVariable,
    type AdminEggVariablePayload,
    createEggVariable,
    deleteEggVariable,
    eggVariablesQueryOptions,
    invalidateNests,
    updateEggVariable,
} from '@/admin/api/nests';
import { FormError } from '@/components/auth/FormError';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const RESERVED_NAMES = [
    'SERVER_MEMORY',
    'SERVER_IP',
    'SERVER_PORT',
    'ENV',
    'HOME',
    'USER',
    'STARTUP',
    'SERVER_UUID',
    'UUID',
];

const schema = z.object({
    name: z.string().min(1, 'A variable name is required.').max(191),
    description: z.string(),
    env_variable: z
        .string()
        .regex(/^\w{1,191}$/, 'The environment variable may only contain letters, numbers and underscores.')
        .refine(
            (value) => !RESERVED_NAMES.includes(value),
            'This environment variable is protected and cannot be assigned to a variable.',
        ),
    default_value: z.string(),
    user_viewable: z.boolean(),
    user_editable: z.boolean(),
    rules: z.string().min(1, 'A validation rule string is required.'),
});

type VariableFormValues = z.infer<typeof schema>;

const EMPTY_VARIABLE: VariableFormValues = {
    name: '',
    description: '',
    env_variable: '',
    default_value: '',
    user_viewable: false,
    user_editable: false,
    rules: 'required|string|max:20',
};

const toPayload = (values: VariableFormValues): AdminEggVariablePayload => ({
    name: values.name,
    description: values.description.trim() || null,
    env_variable: values.env_variable,
    default_value: values.default_value,
    user_viewable: values.user_viewable,
    user_editable: values.user_editable,
    rules: values.rules,
});

const VariableFields: React.FC<{
    form: UseFormReturn<VariableFormValues>;
    idPrefix: string;
    hint: string;
}> = ({ form, idPrefix, hint }) => {
    const { errors } = form.formState;

    return (
        <>
            <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
                <Input id={`${idPrefix}-name`} aria-invalid={!!errors.name} {...form.register('name')} />
                <FieldError errors={[errors.name]} />
            </Field>
            <Field>
                <FieldLabel htmlFor={`${idPrefix}-description`}>Description</FieldLabel>
                <Textarea id={`${idPrefix}-description`} rows={3} {...form.register('description')} />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
                <Field data-invalid={!!errors.env_variable}>
                    <FieldLabel htmlFor={`${idPrefix}-env`}>Environment variable</FieldLabel>
                    <Input
                        id={`${idPrefix}-env`}
                        className='font-mono text-xs'
                        aria-invalid={!!errors.env_variable}
                        {...form.register('env_variable')}
                    />
                    <FieldError errors={[errors.env_variable]} />
                </Field>
                <Field>
                    <FieldLabel htmlFor={`${idPrefix}-default`}>Default value</FieldLabel>
                    <Input id={`${idPrefix}-default`} {...form.register('default_value')} />
                </Field>
            </div>
            <FieldDescription>
                This variable can be accessed in the startup command by using{' '}
                <code className='font-mono text-xs'>{hint}</code>.
            </FieldDescription>
            <div className='flex flex-wrap gap-6'>
                <Field orientation='horizontal' className='w-auto'>
                    <Controller
                        control={form.control}
                        name='user_viewable'
                        render={({ field }) => (
                            <Switch
                                id={`${idPrefix}-viewable`}
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <FieldLabel htmlFor={`${idPrefix}-viewable`}>Users can view</FieldLabel>
                </Field>
                <Field orientation='horizontal' className='w-auto'>
                    <Controller
                        control={form.control}
                        name='user_editable'
                        render={({ field }) => (
                            <Switch
                                id={`${idPrefix}-editable`}
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <FieldLabel htmlFor={`${idPrefix}-editable`}>Users can edit</FieldLabel>
                </Field>
            </div>
            <Field data-invalid={!!errors.rules}>
                <FieldLabel htmlFor={`${idPrefix}-rules`}>Input rules</FieldLabel>
                <Input
                    id={`${idPrefix}-rules`}
                    className='font-mono text-xs'
                    aria-invalid={!!errors.rules}
                    {...form.register('rules')}
                />
                <FieldDescription>
                    These rules are defined using standard{' '}
                    <a
                        href='https://laravel.com/docs/11.x/validation#available-validation-rules'
                        target='_blank'
                        rel='noreferrer'
                    >
                        Laravel Framework validation rules
                    </a>
                    .
                </FieldDescription>
                <FieldError errors={[errors.rules]} />
            </Field>
        </>
    );
};

const VariableCard: React.FC<{
    nestId: number;
    eggId: string;
    variable: AdminEggVariable;
}> = ({ nestId, eggId, variable }) => {
    const queryClient = useQueryClient();
    const form = useForm({
        resolver: zodResolver(schema),
        values: {
            name: variable.name,
            description: variable.description ?? '',
            env_variable: variable.env_variable,
            default_value: variable.default_value ?? '',
            user_viewable: variable.user_viewable,
            user_editable: variable.user_editable,
            rules: variable.rules,
        },
    });

    const invalidate = () => invalidateNests(queryClient);

    const update = useMutation({
        mutationFn: (values: VariableFormValues) =>
            updateEggVariable(nestId, Number(eggId), variable.id, toPayload(values)),
        onSuccess: () => {
            toast.success(
                `The variable "${variable.name}" has been updated. You will need to rebuild any servers using this variable in order to apply changes.`,
            );

            return invalidate();
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteEggVariable(nestId, Number(eggId), variable.id),
        onSuccess: () => {
            toast.success(
                `The variable "${variable.name}" has been deleted and will no longer be available to servers once rebuilt.`,
            );

            return invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <form onSubmit={form.handleSubmit((values) => update.mutate(values))} noValidate>
            <Card>
                <CardHeader>
                    <CardTitle>{variable.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                        <VariableFields
                            form={form}
                            idPrefix={`variable-${variable.id}`}
                            hint={`{{${variable.env_variable}}}`}
                        />
                    </FieldGroup>
                </CardContent>
                <CardFooter className='justify-between'>
                    <ConfirmDeleteButton
                        title={`Delete ${variable.name}?`}
                        description='This variable will no longer be available to servers once they are rebuilt.'
                        label={`Delete ${variable.name}`}
                        disabled={remove.isPending}
                        onConfirm={() => remove.mutate()}
                    />
                    <Button type='submit' disabled={update.isPending}>
                        {update.isPending && <Spinner />}
                        Save
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

const CreateVariableDialog: React.FC<{
    nestId: number;
    eggId: string;
}> = ({ nestId, eggId }) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY_VARIABLE });

    const create = useMutation({
        mutationFn: (values: VariableFormValues) => createEggVariable(nestId, Number(eggId), toPayload(values)),
        onSuccess: () => {
            toast.success('New variable has successfully been created and assigned to this egg.');
            invalidateNests(queryClient);
            form.reset(EMPTY_VARIABLE);
            setIsOpen(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(EMPTY_VARIABLE);
        }

        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm'>
                        <PlusIcon />
                        Create new variable
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-lg'>
                <form onSubmit={form.handleSubmit((values) => create.mutate(values))} noValidate>
                    <DialogHeader>
                        <DialogTitle>Create new egg variable</DialogTitle>
                        <DialogDescription>
                            Variables are exposed to the server as environment variables.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='max-h-[60vh] overflow-y-auto py-4'>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <VariableFields form={form} idPrefix='new-variable' hint='{{environment variable value}}' />
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Close
                        </Button>
                        <Button type='submit' disabled={create.isPending}>
                            {create.isPending && <Spinner />}
                            Create variable
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const EggVariablesTab: React.FC<{
    nestId: number;
    eggId: string;
}> = ({ nestId, eggId }) => {
    const variables = useQuery(eggVariablesQueryOptions(nestId, eggId));

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex justify-end'>
                <CreateVariableDialog nestId={nestId} eggId={eggId} />
            </div>
            <FormError message={variables.error ? httpErrorToHuman(variables.error) : null} />
            {variables.isPending && <Skeleton className='h-64 rounded-xl' />}
            {variables.data?.items.length === 0 && (
                <Empty className='border'>
                    <EmptyHeader>
                        <EmptyTitle>No variables</EmptyTitle>
                        <EmptyDescription>This egg does not define any environment variables yet.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            <div className='grid items-start gap-4 lg:grid-cols-2'>
                {(variables.data?.items ?? []).map((variable) => (
                    <VariableCard key={variable.id} nestId={nestId} eggId={eggId} variable={variable} />
                ))}
            </div>
        </div>
    );
};

export { EggVariablesTab };
