import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

import { type ServerDetails, serverQueryOptions } from '@/api/server/server';

const useServer = (): ServerDetails => {
    const { id } = useParams({ from: '/app/server/$id' });
    const { data } = useSuspenseQuery(serverQueryOptions(id));

    return data;
};

export { useServer };
