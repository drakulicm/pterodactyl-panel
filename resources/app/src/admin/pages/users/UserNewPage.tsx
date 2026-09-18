import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { createUser, invalidateUsers } from '@/admin/api/users';
import { UserForm } from '@/admin/components/users/UserForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { siteConfiguration } from '@/lib/session';

const UserNewPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const create = useMutation({
        mutationFn: createUser,
        onSuccess: (user) => {
            toast.success('Account has been created successfully.');
            invalidateUsers(queryClient);
            navigate({ to: '/admin/users/view/$userId', params: { userId: String(user.id) } });
        },
    });

    return (
        <>
            <PageHeader title='Create user'>
                <Button size='sm' variant='outline' render={<Link to='/admin/users' />}>
                    Back
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <p className='text-sm text-muted-foreground'>Add a new user to the system.</p>
                <UserForm
                    mode='new'
                    defaultValues={{
                        email: '',
                        username: '',
                        first_name: '',
                        last_name: '',
                        language: siteConfiguration.locale,
                        root_admin: false,
                        password: '',
                    }}
                    isPending={create.isPending}
                    error={create.error}
                    onSubmit={(payload) => create.mutate(payload)}
                />
            </div>
        </>
    );
};

export { UserNewPage };
