import { useQuery } from '@tanstack/react-query';
import { HeartCrackIcon, HeartPulseIcon } from 'lucide-react';

import { nodeSystemInformationQueryOptions } from '@/admin/api/nodes';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { httpErrorToHuman } from '@/lib/http';

const NodeHealthIndicator: React.FC<{
    nodeId: number;
}> = ({ nodeId }) => {
    const information = useQuery(nodeSystemInformationQueryOptions(nodeId));

    if (information.isPending) {
        return <Spinner className='size-4 text-muted-foreground' />;
    }

    return (
        <Tooltip>
            <TooltipTrigger render={<span className='inline-flex' />}>
                {information.data ? (
                    <HeartPulseIcon className='size-4 text-success' />
                ) : (
                    <HeartCrackIcon className='size-4 text-destructive' />
                )}
            </TooltipTrigger>
            <TooltipContent>
                {information.data
                    ? `Wings v${information.data.version}`
                    : `Error connecting to node! ${httpErrorToHuman(information.error)}`}
            </TooltipContent>
        </Tooltip>
    );
};

export { NodeHealthIndicator };
