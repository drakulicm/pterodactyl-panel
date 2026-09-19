import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createServerBackup, serverBackupsKey } from '@/api/server/backups';
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
} from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const schema = z.object({
    name: z.string().max(191, 'The backup name cannot exceed 191 characters.'),
    ignored: z.string(),
    isLocked: z.boolean(),
});

const CreateBackupDialog: React.FC = () => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', ignored: '', isLocked: false },
    });

    const create = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => createServerBackup(server.uuid, values),
        onSuccess: () => {
            toast.success('Backup started.');
            queryClient.invalidateQueries({ queryKey: serverBackupsKey(server.uuid) });
            setIsOpen(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            form.reset();
            create.reset();
        }
    };

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <>
            <Button size='sm' onClick={() => handleOpenChange(true)}>
                <PlusIcon />
                New backup
            </Button>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create server backup</DialogTitle>
                        <DialogDescription>Generates an archive of the files on this server.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} noValidate>
                        <FieldGroup>
                            <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                            <Field data-invalid={!!form.formState.errors.name}>
                                <FieldLabel htmlFor='backup-name'>Backup name</FieldLabel>
                                <Input
                                    id='backup-name'
                                    aria-invalid={!!form.formState.errors.name}
                                    {...form.register('name')}
                                />
                                <FieldDescription>
                                    If provided, the name that should be used to reference this backup.
                                </FieldDescription>
                                <FieldError errors={[form.formState.errors.name]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='backup-ignored'>Ignored files &amp; directories</FieldLabel>
                                <Textarea
                                    id='backup-ignored'
                                    rows={6}
                                    className='font-mono'
                                    {...form.register('ignored')}
                                />
                                <FieldDescription>
                                    Enter the files or folders to ignore while generating this backup. Leave blank to
                                    use the contents of the .pteroignore file in the root of the server directory if
                                    present. Wildcard matching is supported, and a rule can be negated by prefixing the
                                    path with an exclamation point.
                                </FieldDescription>
                            </Field>
                            {hasPermission(permissions, 'backup.delete') && (
                                <Controller
                                    control={form.control}
                                    name='isLocked'
                                    render={({ field }) => (
                                        <Field orientation='horizontal'>
                                            <Checkbox
                                                id='backup-locked'
                                                checked={field.value}
                                                onCheckedChange={(checked) => field.onChange(checked)}
                                            />
                                            <FieldContent>
                                                <FieldLabel htmlFor='backup-locked'>Locked</FieldLabel>
                                                <FieldDescription>
                                                    Prevents this backup from being deleted until explicitly unlocked.
                                                </FieldDescription>
                                            </FieldContent>
                                        </Field>
                                    )}
                                />
                            )}
                        </FieldGroup>
                        <DialogFooter className='mt-6'>
                            <Button type='button' variant='outline' onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button type='submit' disabled={create.isPending}>
                                {create.isPending && <Spinner />}
                                Start backup
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export { CreateBackupDialog };
