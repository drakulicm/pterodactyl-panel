import { useQuery } from '@tanstack/react-query';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type AdminServerUser, userSearchQueryOptions } from '@/admin/api/servers';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';

const useDebouncedValue = (value: string, delay: number): string => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timeout);
    }, [value, delay]);

    return debounced;
};

const OwnerPicker: React.FC<{
    value: number | null;
    selectedLabel?: string | null;
    onChange: (user: AdminServerUser) => void;
}> = ({ value, selectedLabel, onChange }) => {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 250);
    const users = useQuery(userSearchQueryOptions(debouncedSearch));

    const results = users.data ?? [];

    return (
        <div className='flex flex-col gap-2'>
            <InputGroup>
                <InputGroupInput
                    placeholder='Search users by email...'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <InputGroupAddon>{users.isFetching ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
            </InputGroup>
            {debouncedSearch.length >= 2 && (
                <div className='max-h-48 overflow-y-auto rounded-lg border'>
                    {results.length === 0 && !users.isFetching && (
                        <p className='p-3 text-sm text-muted-foreground'>No users matched that email address.</p>
                    )}
                    {results.map((user) => (
                        <Button
                            key={user.id}
                            variant='ghost'
                            className='h-auto w-full justify-start rounded-none px-3 py-2 text-left'
                            onClick={() => onChange(user)}
                        >
                            {value === user.id ? <CheckIcon /> : <span className='size-4' />}
                            <span className='flex flex-col items-start'>
                                <span className='text-sm'>
                                    {user.first_name} {user.last_name}
                                </span>
                                <span className='text-xs text-muted-foreground'>
                                    {user.email} · {user.username}
                                </span>
                            </span>
                        </Button>
                    ))}
                </div>
            )}
            <p className='text-sm text-muted-foreground'>
                {selectedLabel ? (
                    <>
                        Selected owner: <span className='font-medium text-foreground'>{selectedLabel}</span>
                    </>
                ) : (
                    'No owner selected yet.'
                )}
            </p>
        </div>
    );
};

export { OwnerPicker };
