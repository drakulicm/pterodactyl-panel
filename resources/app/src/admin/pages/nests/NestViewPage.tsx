import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    deleteNest,
    exportEgg,
    getEggServerCount,
    getNestEggs,
    getNestServerCount,
    invalidateNests,
    nestQueryOptions,
    updateNest,
} from '@/admin/api/nests';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    name: z
        .string()
        .min(1, 'A nest name is required.')
        .max(191, 'The name may not be greater than 191 characters.')
        .regex(/^[\w\- ]+$/, 'The name may only contain letters, numbers, dashes, underscores and spaces.'),
    description: z.string(),
});

type FormValues = z.infer<typeof schema>;

const NestViewPage: React.FC = () => {
    const { nestId } = useParams({ from: '/admin/nests/view/$nestId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const nest = useQuery(nestQueryOptions(nestId));
    const attributes = nest.data;
    const eggs = attributes ? getNestEggs(attributes) : [];
    const serverCount = attributes ? getNestServerCount(attributes) : 0;

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { name: '', description: '' },
        values: attributes ? { name: attributes.name, description: attributes.description ?? '' } : undefined,
    });
    const { errors } = form.formState;

    const invalidate = () => invalidateNests(queryClient);

    const update = useMutation({
        mutationFn: (values: FormValues) =>
            updateNest(Number(nestId), { name: values.name, description: values.description.trim() || null }),
        onSuccess: () => {
            toast.success('Successfully updated the nest configuration options.');

            return invalidate();
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteNest(Number(nestId)),
        onSuccess: () => {
            toast.success('Successfully deleted the requested nest from the Panel.');
            queryClient.invalidateQueries({ queryKey: ['admin', '/nests'] });
            navigate({ to: '/admin/nests' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleExport = (eggId: number, name: string) =>
        exportEgg(Number(nestId), eggId, name).catch((error) => toast.error(httpErrorToHuman(error)));

    return (
        <>
            <PageHeader title={attributes ? `Nest: ${attributes.name}` : 'Nest'}>
                <Button size='sm' variant='outline' render={<Link to='/admin/nests' />}>
                    Back
                </Button>
                <Button size='sm' render={<Link to='/admin/nests/egg/new' search={{ nest: Number(nestId) }} />}>
                    <PlusIcon />
                    New egg
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <FormError message={nest.error ? httpErrorToHuman(nest.error) : null} />
                {nest.isPending && <Skeleton className='h-96 rounded-xl' />}
                {attributes && (
                    <>
                        <form onSubmit={form.handleSubmit((values) => update.mutate(values))} noValidate>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Nest details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FieldGroup>
                                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                                        <div className='grid items-start gap-4 lg:grid-cols-2'>
                                            <FieldGroup>
                                                <Field data-invalid={!!errors.name}>
                                                    <FieldLabel htmlFor='nest-name'>Name</FieldLabel>
                                                    <Input
                                                        id='nest-name'
                                                        aria-invalid={!!errors.name}
                                                        {...form.register('name')}
                                                    />
                                                    <FieldDescription>
                                                        This should be a descriptive category name that encompasses all
                                                        of the options within the service.
                                                    </FieldDescription>
                                                    <FieldError errors={[errors.name]} />
                                                </Field>
                                                <Field>
                                                    <FieldLabel htmlFor='nest-description'>Description</FieldLabel>
                                                    <Textarea
                                                        id='nest-description'
                                                        rows={6}
                                                        {...form.register('description')}
                                                    />
                                                </Field>
                                            </FieldGroup>
                                            <FieldGroup>
                                                <Field>
                                                    <FieldLabel htmlFor='nest-id'>Nest ID</FieldLabel>
                                                    <Input id='nest-id' readOnly value={attributes.id} />
                                                    <FieldDescription>
                                                        A unique ID used for identification of this nest internally and
                                                        through the API.
                                                    </FieldDescription>
                                                </Field>
                                                <Field>
                                                    <FieldLabel htmlFor='nest-author'>Author</FieldLabel>
                                                    <Input id='nest-author' readOnly value={attributes.author} />
                                                    <FieldDescription>
                                                        The author of this service option. Please direct questions and
                                                        issues to them unless this is an official option.
                                                    </FieldDescription>
                                                </Field>
                                                <Field>
                                                    <FieldLabel htmlFor='nest-uuid'>UUID</FieldLabel>
                                                    <Input
                                                        id='nest-uuid'
                                                        readOnly
                                                        className='font-mono text-xs'
                                                        value={attributes.uuid}
                                                    />
                                                    <FieldDescription>
                                                        A UUID that all servers using this option are assigned for
                                                        identification purposes.
                                                    </FieldDescription>
                                                </Field>
                                            </FieldGroup>
                                        </div>
                                    </FieldGroup>
                                </CardContent>
                                <CardFooter className='justify-end'>
                                    <Button type='submit' disabled={update.isPending}>
                                        {update.isPending && <Spinner />}
                                        Save
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                        <Card>
                            <CardHeader>
                                <CardTitle>Nest eggs</CardTitle>
                                <CardDescription>Every egg that belongs to this nest.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {eggs.length === 0 ? (
                                    <p className='text-sm text-muted-foreground'>This nest has no eggs yet.</p>
                                ) : (
                                    <div className='overflow-hidden rounded-xl border'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='w-16'>ID</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className='text-center'>Servers</TableHead>
                                                    <TableHead className='w-12' />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {eggs.map((egg) => (
                                                    <TableRow key={egg.id}>
                                                        <TableCell>
                                                            <code className='font-mono text-xs text-muted-foreground'>
                                                                {egg.id}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link
                                                                to='/admin/nests/egg/$eggId'
                                                                params={{ eggId: String(egg.id) }}
                                                                className='underline-offset-4 hover:underline'
                                                            >
                                                                {egg.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className='max-w-md text-muted-foreground'>
                                                            {egg.description}
                                                        </TableCell>
                                                        <TableCell className='text-center tabular-nums'>
                                                            {getEggServerCount(egg)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant='ghost'
                                                                size='icon-sm'
                                                                aria-label={`Export ${egg.name}`}
                                                                onClick={() => handleExport(egg.id, egg.name)}
                                                            >
                                                                <DownloadIcon />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className='border-destructive/40'>
                            <CardHeader>
                                <CardTitle>Delete nest</CardTitle>
                                <CardDescription>
                                    {serverCount > 0
                                        ? 'A Nest with active servers attached to it cannot be deleted from the Panel.'
                                        : 'Deleting this nest will also delete every egg that belongs to it.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='flex justify-end'>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                variant='destructive'
                                                disabled={serverCount > 0 || remove.isPending}
                                            />
                                        }
                                    >
                                        Delete nest
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {attributes.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This nest and all {eggs.length} of its eggs will be permanently removed
                                                from the Panel. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction variant='destructive' onClick={() => remove.mutate()}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
};

export { NestViewPage };
