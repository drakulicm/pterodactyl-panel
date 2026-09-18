import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { LockIcon, PlusIcon, ShieldCheckIcon, UnlockIcon } from 'lucide-react';
import { useState } from 'react';

import { type AdminUser, type AdminUserFilter, getUserServers, USER_FILTERS, usersQueryOptions } from '@/admin/api/users';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columns: AdminColumn<AdminUser>[] = [
    {
        header: 'ID',
        className: 'w-16',
        cell: (user) => <code className='font-mono text-xs text-muted-foreground'>{user.id}</code>,
    },
    {
        header: 'Email',
        cell: (user) => (
            <span className='flex items-center gap-1.5'>
                {user.email}
                {user.root_admin && <ShieldCheckIcon className='size-3.5 text-amber-500' />}
            </span>
        ),
    },
    {
        header: 'Client name',
        cell: (user) => `${user.last_name}, ${user.first_name}`,
    },
    {
        header: 'Username',
        cell: (user) => user.username,
    },
    {
        header: '2FA',
        className: 'text-center',
        cell: (user) =>
            user['2fa'] ? (
                <LockIcon className='mx-auto size-3.5 text-emerald-500' />
            ) : (
                <UnlockIcon className='mx-auto size-3.5 text-destructive' />
            ),
    },
    {
        header: 'Servers owned',
        className: 'text-center tabular-nums',
        cell: (user) => getUserServers(user).length,
    },
];

const UsersPage: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<AdminUserFilter>('email');
    const [search, setSearch] = useState('');

    const users = useQuery(usersQueryOptions({ page, filter, search }));

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <>
            <PageHeader title='Users'>
                <Button size='sm' render={<Link to='/admin/users/new' />}>
                    <PlusIcon />
                    Create new
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <p className='text-sm text-muted-foreground'>All registered users on the system.</p>
                <AdminDataTable
                    query={users}
                    columns={columns}
                    getRowKey={(user) => user.id}
                    emptyTitle='No users found'
                    emptyDescription='No accounts matched the filter you provided.'
                    search={search}
                    searchPlaceholder='Search users...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(user) =>
                        navigate({ to: '/admin/users/view/$userId', params: { userId: String(user.id) } })
                    }
                    toolbar={
                        <Select
                            items={USER_FILTERS}
                            value={filter}
                            onValueChange={(value) => value && setFilter(value as AdminUserFilter)}
                        >
                            <SelectTrigger size='sm' className='w-40'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {USER_FILTERS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
            </div>
        </>
    );
};

export { UsersPage };
