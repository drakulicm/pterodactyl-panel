import { useQuery } from '@tanstack/react-query';
import { SearchIcon, ServerOffIcon } from 'lucide-react';
import { useState } from 'react';

import { serversQueryOptions } from '@/api/servers';
import { FormError } from '@/components/auth/FormError';
import { ServerCard } from '@/components/dashboard/ServerCard';
import { ListPagination } from '@/components/layout/ListPagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { httpErrorToHuman } from '@/lib/http';
import { sessionUser } from '@/lib/session';

const SHOW_OTHERS_STORAGE_KEY = `${sessionUser?.uuid}:show_all_servers`;

const DashboardPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showOthers, setShowOthers] = useState(
        () => !!sessionUser?.rootAdmin && localStorage.getItem(SHOW_OTHERS_STORAGE_KEY) === 'true',
    );
    const query = useDebouncedValue(search.trim());

    const { data, error, isPending } = useQuery(
        serversQueryOptions({ page, query, type: showOthers ? 'admin' : undefined }),
    );

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
        setPage(1);
    };

    const handleShowOthersChange = (checked: boolean) => {
        localStorage.setItem(SHOW_OTHERS_STORAGE_KEY, String(checked));
        setShowOthers(checked);
        setPage(1);
    };

    return (
        <>
            <PageHeader title={showOthers ? "Others' servers" : 'Your servers'}>
                {sessionUser?.rootAdmin && (
                    <div className='flex items-center gap-2'>
                        <Label htmlFor='show-others' className='text-xs text-muted-foreground'>
                            Show others&apos; servers
                        </Label>
                        <Switch id='show-others' checked={showOthers} onCheckedChange={handleShowOthersChange} />
                    </div>
                )}
            </PageHeader>
            <div className='flex flex-1 flex-col gap-4 p-4'>
                <InputGroup className='max-w-sm'>
                    <InputGroupInput placeholder='Search servers...' value={search} onChange={handleSearchChange} />
                    <InputGroupAddon>
                        <SearchIcon />
                    </InputGroupAddon>
                </InputGroup>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                {isPending ? (
                    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                        {Array.from({ length: 3 }, (_, index) => (
                            <Skeleton key={index} className='h-36 rounded-xl' />
                        ))}
                    </div>
                ) : data?.items.length ? (
                    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                        {data.items.map((server) => (
                            <ServerCard key={server.uuid} server={server} />
                        ))}
                    </div>
                ) : (
                    !error && (
                        <Empty className='border'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <ServerOffIcon />
                                </EmptyMedia>
                                <EmptyTitle>No servers found</EmptyTitle>
                                <EmptyDescription>
                                    {query
                                        ? 'No servers match your search.'
                                        : showOthers
                                          ? 'There are no other servers to display.'
                                          : 'There are no servers associated with your account.'}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
                {data && <ListPagination pagination={data.pagination} onPageChange={setPage} />}
            </div>
        </>
    );
};

export { DashboardPage };
