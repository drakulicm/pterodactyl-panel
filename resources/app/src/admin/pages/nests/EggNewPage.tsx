import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    type AdminEggPayload,
    createEgg,
    invalidateNests,
    nestEggsQueryOptions,
    nestsQueryOptions,
} from '@/admin/api/nests';
import { EggConfigurationForm } from '@/admin/components/nests/EggConfigurationForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

const EMPTY_EGG = {
    name: '',
    description: '',
    docker_images: '',
    startup: '',
    features: '',
    file_denylist: '',
    force_outgoing_ip: false,
    config_from: '',
    config_stop: '',
    config_startup: '',
    config_logs: '',
    config_files: '',
};

const EggNewPage: React.FC = () => {
    const { nest } = useSearch({ from: '/admin/nests/egg/new' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [nestId, setNestId] = useState<number | undefined>(nest);

    const nests = useQuery(nestsQueryOptions({ page: 1 }));
    const eggs = useQuery({ ...nestEggsQueryOptions(nestId), enabled: nestId !== undefined });

    const create = useMutation({
        mutationFn: (payload: AdminEggPayload) => createEgg(Number(nestId), payload),
        onSuccess: (egg) => {
            toast.success(
                'A new egg was laid successfully. You will need to restart any running daemons to apply this new egg.',
            );
            invalidateNests(queryClient);
            navigate({ to: '/admin/nests/egg/$eggId', params: { eggId: String(egg.id) } });
        },
    });

    return (
        <>
            <PageHeader title='New egg'>
                <Button size='sm' variant='outline' render={<Link to='/admin/nests' />}>
                    Back
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <p className='text-sm text-muted-foreground'>Create a new Egg to assign to servers.</p>
                <EggConfigurationForm
                    mode='new'
                    defaultValues={EMPTY_EGG}
                    nests={nests.data?.items ?? []}
                    nestId={nestId}
                    eggsInNest={eggs.data?.items ?? []}
                    isPending={create.isPending}
                    error={create.error}
                    onNestChange={setNestId}
                    onSubmit={(payload) => create.mutate(payload)}
                />
            </div>
        </>
    );
};

export { EggNewPage };
