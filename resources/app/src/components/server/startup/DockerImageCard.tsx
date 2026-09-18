import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { serverQueryOptions } from '@/api/server/server';
import { setSelectedDockerImage } from '@/api/server/startup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const DockerImageCard: React.FC<{
    dockerImages: Record<string, string>;
}> = ({ dockerImages }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();

    const items = Object.entries(dockerImages).map(([label, value]) => ({ label, value }));
    const selected = items.find((item) => item.value.toLowerCase() === server.dockerImage.toLowerCase());
    const isCustomImage = !selected;
    const canSelect = items.length > 1 && !isCustomImage;

    const update = useMutation({
        mutationFn: (image: string) => setSelectedDockerImage(server.uuid, image),
        onSuccess: () => {
            toast.success('Docker image updated.');

            return queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleValueChange = (image: string | null) => {
        if (image === null || image === selected?.value) {
            return;
        }

        update.mutate(image);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    Docker image
                    {update.isPending && <Spinner />}
                </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-2'>
                {canSelect ? (
                    <>
                        <Select
                            items={items}
                            value={update.isPending ? update.variables : selected.value}
                            disabled={update.isPending || !hasPermission(permissions, 'startup.docker-image')}
                            onValueChange={handleValueChange}
                        >
                            <SelectTrigger className='w-full' aria-label='Docker image'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className='text-xs text-muted-foreground'>
                            This is an advanced feature allowing you to select a Docker image to use when running this
                            server instance.
                        </p>
                    </>
                ) : (
                    <>
                        <Input aria-label='Docker image' value={server.dockerImage} readOnly disabled />
                        {isCustomImage && (
                            <p className='text-xs text-muted-foreground'>
                                This server&apos;s Docker image has been manually set by an administrator and cannot be
                                changed through this UI.
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export { DockerImageCard };
