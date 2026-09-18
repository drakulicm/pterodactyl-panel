import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { systemPermissionsQueryOptions } from '@/api/permissions';
import { createOrUpdateSubuser, serverSubusersQueryOptions, type Subuser } from '@/api/server/subusers';
import { FormError } from '@/components/auth/FormError';
import { PermissionGroupCard } from '@/components/server/users/PermissionGroupCard';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';
import { sessionUser } from '@/lib/session';

const schema = z.object({
    email: z
        .email('A valid email address must be provided.')
        .max(191, 'Email addresses must not exceed 191 characters.'),
    permissions: z.array(z.string()),
});

type Values = z.infer<typeof schema>;

const toValues = (subuser?: Subuser): Values => ({
    email: subuser?.email ?? '',
    permissions: subuser?.permissions ?? [],
});

const EditSubuserDialog: React.FC<{
    subuser?: Subuser;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ subuser, isOpen, onOpenChange }) => {
    const { server, permissions: loggedInPermissions } = useServer();
    const queryClient = useQueryClient();
    const systemPermissions = useQuery({ ...systemPermissionsQueryOptions, enabled: isOpen });
    const form = useForm<Values>({ resolver: zodResolver(schema), values: toValues(subuser) });

    const canEditUser = hasPermission(loggedInPermissions, subuser ? 'user.update' : 'user.create');
    const hasAllPermissions =
        !!sessionUser?.rootAdmin || (loggedInPermissions.length === 1 && loggedInPermissions[0] === '*');

    const editablePermissions = useMemo(() => {
        const list = Object.entries(systemPermissions.data ?? {}).flatMap(([groupKey, group]) =>
            Object.keys(group.keys).map((key) => `${groupKey}.${key}`),
        );

        if (hasAllPermissions) {
            return list;
        }

        return list.filter((permission) => loggedInPermissions.includes(permission));
    }, [systemPermissions.data, hasAllPermissions, loggedInPermissions]);

    const save = useMutation({
        mutationFn: (values: Values) => createOrUpdateSubuser(server.uuid, values, subuser?.uuid),
        onSuccess: (saved) => {
            toast.success(
                subuser ? `Permissions for ${saved.email} have been updated.` : `${saved.email} has been invited.`,
            );
            queryClient.invalidateQueries({ queryKey: serverSubusersQueryOptions(server.uuid).queryKey });
            handleOpenChange(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(toValues(subuser));
            save.reset();
        }

        onOpenChange(open);
    };

    const handleSubmit = form.handleSubmit((values) => save.mutate(values));

    const error = systemPermissions.error ?? save.error;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl'>
                <form onSubmit={handleSubmit} noValidate className='contents'>
                    <DialogHeader>
                        <DialogTitle>
                            {subuser
                                ? `${canEditUser ? 'Modify' : 'View'} permissions for ${subuser.email}`
                                : 'Create new subuser'}
                        </DialogTitle>
                        {!hasAllPermissions && (
                            <DialogDescription>
                                Only permissions which your account is currently assigned may be selected when creating
                                or modifying other users.
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <FieldGroup>
                        <FormError message={error ? httpErrorToHuman(error) : null} />
                        {!subuser && (
                            <Field data-invalid={!!form.formState.errors.email}>
                                <FieldLabel htmlFor='subuser-email'>User email</FieldLabel>
                                <Input
                                    id='subuser-email'
                                    type='email'
                                    autoComplete='off'
                                    aria-invalid={!!form.formState.errors.email}
                                    {...form.register('email')}
                                />
                                <FieldDescription>
                                    Enter the email address of the user you wish to invite as a subuser for this server.
                                </FieldDescription>
                                <FieldError errors={[form.formState.errors.email]} />
                            </Field>
                        )}
                        {systemPermissions.isPending ? (
                            <Skeleton className='h-64' />
                        ) : (
                            <Controller
                                control={form.control}
                                name='permissions'
                                render={({ field }) => (
                                    <div className='flex flex-col gap-3'>
                                        {Object.entries(systemPermissions.data ?? {})
                                            .filter(([groupKey]) => groupKey !== 'websocket')
                                            .map(([groupKey, group]) => (
                                                <PermissionGroupCard
                                                    key={groupKey}
                                                    groupKey={groupKey}
                                                    group={group}
                                                    selected={field.value}
                                                    editablePermissions={editablePermissions}
                                                    isEditable={canEditUser}
                                                    onChange={field.onChange}
                                                />
                                            ))}
                                    </div>
                                )}
                            />
                        )}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            {canEditUser ? 'Cancel' : 'Close'}
                        </Button>
                        {canEditUser && (
                            <Button type='submit' disabled={save.isPending || !systemPermissions.isSuccess}>
                                {save.isPending && <Spinner />}
                                {subuser ? 'Save' : 'Invite user'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { EditSubuserDialog };
