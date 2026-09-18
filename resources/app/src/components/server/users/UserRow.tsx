import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteSubuser, serverSubusersQueryOptions, type Subuser } from '@/api/server/subusers';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { EditSubuserDialog } from '@/components/server/users/EditSubuserDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';
import { sessionUser } from '@/lib/session';

const UserRow: React.FC<{
    subuser: Subuser;
}> = ({ subuser }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const isSelf = subuser.uuid === sessionUser?.uuid;
    const canUpdate = !isSelf && hasPermission(permissions, 'user.update');
    const canDelete = !isSelf && hasPermission(permissions, 'user.delete');
    const permissionCount = subuser.permissions.filter((permission) => permission !== 'websocket.connect').length;

    const remove = useMutation({
        mutationFn: () => deleteSubuser(server.uuid, subuser.uuid),
        onSuccess: () => {
            toast.success(`${subuser.email} has been removed from this server.`);
            queryClient.invalidateQueries({ queryKey: serverSubusersQueryOptions(server.uuid).queryKey });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <div className='flex items-center gap-3 rounded-lg border bg-card p-3'>
            <Avatar className='hidden sm:flex'>
                <AvatarImage src={`${subuser.image}?s=80`} alt='' />
                <AvatarFallback>{subuser.email.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-sm font-medium'>{subuser.email}</span>
                <span className='text-xs text-muted-foreground'>
                    {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
                </span>
            </div>
            <Badge variant={subuser.twoFactorEnabled ? 'secondary' : 'destructive'}>
                {subuser.twoFactorEnabled ? <ShieldCheckIcon /> : <ShieldOffIcon />}
                {subuser.twoFactorEnabled ? '2FA enabled' : '2FA disabled'}
            </Badge>
            {(canUpdate || canDelete) && (
                <div className='flex shrink-0 items-center gap-1'>
                    {canUpdate && (
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Edit ${subuser.email}`}
                            onClick={() => setIsEditing(true)}
                        >
                            <PencilIcon />
                        </Button>
                    )}
                    {canDelete && (
                        <ConfirmDeleteButton
                            title='Delete this subuser?'
                            description='Are you sure you wish to remove this subuser? They will have all access to this server revoked immediately.'
                            label={`Remove ${subuser.email}`}
                            disabled={remove.isPending}
                            onConfirm={() => remove.mutate()}
                        />
                    )}
                </div>
            )}
            {canUpdate && <EditSubuserDialog subuser={subuser} isOpen={isEditing} onOpenChange={setIsEditing} />}
        </div>
    );
};

export { UserRow };
