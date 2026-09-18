import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { deleteLocation, getLocationNodes, locationQueryOptions, updateLocation } from '@/admin/api/locations';
import { locationSchema, type LocationFormValues } from '@/admin/components/locations/locationSchema';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const LocationPage: React.FC = () => {
    const { locationId } = useParams({ from: '/admin/locations/view/$locationId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const location = useQuery(locationQueryOptions(Number(locationId)));
    const attributes = location.data;
    const nodes = attributes ? getLocationNodes(attributes) : [];

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: { short: '', long: '' },
        values: attributes ? { short: attributes.short, long: attributes.long ?? '' } : undefined,
    });
    const { errors } = form.formState;

    const update = useMutation({
        mutationFn: (values: LocationFormValues) =>
            updateLocation(Number(locationId), { short: values.short, long: values.long || null }),
        onSuccess: async (updated) => {
            toast.success(`${updated.short} has been updated.`);

            return queryClient.invalidateQueries({
                predicate: (query) => String(query.queryKey[1] ?? '').startsWith('/locations'),
            });
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteLocation(Number(locationId)),
        onSuccess: async () => {
            toast.success('The location has been deleted.');
            queryClient.removeQueries({ queryKey: ['admin', `/locations/${locationId}`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', '/locations'] });
            await navigate({ to: '/admin/locations' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <>
            <PageHeader title={attributes ? attributes.short : 'Location'}>
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/locations' />}>
                    Back to locations
                </Button>
            </PageHeader>
            <div className='mx-auto grid w-full max-w-5xl items-start gap-4 p-4 lg:grid-cols-2'>
                <FormError message={location.error ? httpErrorToHuman(location.error) : null} />
                {location.isPending && <Skeleton className='h-72 rounded-xl' />}
                {attributes && (
                    <>
                        <form onSubmit={handleSubmit} noValidate>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FieldGroup>
                                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                                        <Field data-invalid={!!errors.short}>
                                            <FieldLabel htmlFor='location-short'>Short code</FieldLabel>
                                            <Input
                                                id='location-short'
                                                aria-invalid={!!errors.short}
                                                {...form.register('short')}
                                            />
                                            <FieldDescription>
                                                A short identifier used to distinguish this location from others. Must
                                                be between 1 and 60 characters.
                                            </FieldDescription>
                                            <FieldError errors={[errors.short]} />
                                        </Field>
                                        <Field data-invalid={!!errors.long}>
                                            <FieldLabel htmlFor='location-long'>Description</FieldLabel>
                                            <Textarea id='location-long' rows={4} {...form.register('long')} />
                                            <FieldDescription>
                                                A longer description of this location. Must be less than 191 characters.
                                            </FieldDescription>
                                            <FieldError errors={[errors.long]} />
                                        </Field>
                                    </FieldGroup>
                                </CardContent>
                                <CardFooter className='justify-between'>
                                    <AlertDialog>
                                        <AlertDialogTrigger
                                            render={
                                                <Button
                                                    type='button'
                                                    variant='destructive'
                                                    disabled={remove.isPending}
                                                />
                                            }
                                        >
                                            Delete location
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete location</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Deleting {attributes.short} is permanent. A location that still has
                                                    nodes attached to it cannot be deleted.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    variant='destructive'
                                                    onClick={() => remove.mutate()}
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button type='submit' disabled={update.isPending}>
                                        {update.isPending && <Spinner />}
                                        Save
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                        <Card>
                            <CardHeader>
                                <CardTitle>Nodes</CardTitle>
                                <CardDescription>Nodes assigned to this location.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {nodes.length ? (
                                    <div className='overflow-hidden rounded-xl border'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>FQDN</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {nodes.map((node) => (
                                                    <TableRow key={node.id}>
                                                        <TableCell>
                                                            <Link
                                                                to='/admin/nodes/view/$nodeId'
                                                                params={{ nodeId: String(node.id) }}
                                                                search={{ tab: 'about' }}
                                                                className='font-medium hover:underline'
                                                            >
                                                                {node.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className='rounded bg-muted px-2 py-1 font-mono text-xs'>
                                                                {node.fqdn}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    node.maintenance_mode ? 'destructive' : 'secondary'
                                                                }
                                                            >
                                                                {node.maintenance_mode ? 'Maintenance' : 'Available'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Empty className='border'>
                                        <EmptyHeader>
                                            <EmptyTitle>No nodes in this location</EmptyTitle>
                                        </EmptyHeader>
                                    </Empty>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
};

export { LocationPage };
