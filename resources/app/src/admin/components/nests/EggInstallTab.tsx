import { LanguageDescription, type LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { type AdminEgg, invalidateNests, updateEggScript } from '@/admin/api/nests';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { EDITOR_THEMES } from '@/lib/editorTheme';
import { httpErrorToHuman } from '@/lib/http';
import { useThemeStore } from '@/stores/themeStore';

const schema = z.object({
    script_container: z.string().min(1, 'A script container is required.'),
    script_entry: z.string().min(1, 'A script entrypoint is required.'),
    copy_script_from: z.string(),
});

type ScriptFormValues = z.infer<typeof schema>;

const EggInstallTab: React.FC<{
    nestId: number;
    egg: AdminEgg;
    eggsInNest: AdminEgg[];
}> = ({ nestId, egg, eggsInNest }) => {
    const queryClient = useQueryClient();
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const [script, setScript] = useState(egg.script.install ?? '');
    const [language, setLanguage] = useState<LanguageSupport | null>(null);

    const form = useForm<ScriptFormValues>({
        resolver: zodResolver(schema),
        values: {
            script_container: egg.script.container,
            script_entry: egg.script.entry,
            copy_script_from: egg.script.extends === null ? '' : String(egg.script.extends),
        },
    });
    const { errors } = form.formState;

    useEffect(() => {
        setScript(egg.script.install ?? '');
    }, [egg.id, egg.script.install]);

    useEffect(() => {
        const description = LanguageDescription.matchFilename(languages, 'install.sh');
        if (!description) {
            return;
        }

        let isActive = true;
        description.load().then((support) => isActive && setLanguage(support));

        return () => {
            isActive = false;
        };
    }, []);

    const extensions = useMemo(() => (language ? [language] : []), [language]);

    const copyOptions = [
        { value: '', label: 'None' },
        ...eggsInNest
            .filter((option) => option.id !== egg.id && option.script.extends === null)
            .map((option) => ({ value: String(option.id), label: option.name })),
    ];

    const parent = eggsInNest.find((option) => option.id === egg.script.extends);

    const update = useMutation({
        mutationFn: (values: ScriptFormValues) =>
            updateEggScript(nestId, egg.id, {
                script_install: script.trim() === '' ? null : script,
                script_is_privileged: egg.script.privileged,
                script_entry: values.script_entry,
                script_container: values.script_container,
                copy_script_from: values.copy_script_from === '' ? null : Number(values.copy_script_from),
            }),
        onSuccess: () => {
            toast.success('Egg install script has been updated and will run whenever servers are installed.');

            return invalidateNests(queryClient);
        },
    });

    return (
        <form onSubmit={form.handleSubmit((values) => update.mutate(values))} noValidate>
            <Card>
                <CardHeader>
                    <CardTitle>Install script</CardTitle>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                        {egg.script.extends !== null && (
                            <Alert>
                                <AlertDescription>
                                    This egg is copying installation scripts and container options from{' '}
                                    {parent ? (
                                        <Link
                                            to='/admin/nests/egg/$eggId'
                                            params={{ eggId: String(parent.id) }}
                                            className='underline underline-offset-4'
                                        >
                                            {parent.name}
                                        </Link>
                                    ) : (
                                        `egg #${egg.script.extends}`
                                    )}
                                    . Any changes you make to this script will not apply unless you select
                                    &quot;None&quot; from the dropdown box below.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className='min-h-96 overflow-hidden rounded-xl border'>
                            <CodeMirror
                                value={script}
                                theme={EDITOR_THEMES[resolvedMode]}
                                height='100%'
                                className='h-full text-xs [&_.cm-editor]:min-h-96 [&_.cm-scroller]:font-mono'
                                extensions={extensions}
                                onChange={setScript}
                            />
                        </div>
                        <div className='grid items-start gap-4 lg:grid-cols-3'>
                            <Field>
                                <FieldLabel htmlFor='egg-copy-script-from'>Copy script from</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='copy_script_from'
                                    render={({ field }) => (
                                        <Select
                                            items={copyOptions}
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(String(value ?? ''))}
                                        >
                                            <SelectTrigger id='egg-copy-script-from' className='w-full'>
                                                <SelectValue placeholder='None' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {copyOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldDescription>
                                    If selected, the script above will be ignored and the script from the selected egg
                                    will be used in its place.
                                </FieldDescription>
                            </Field>
                            <Field data-invalid={!!errors.script_container}>
                                <FieldLabel htmlFor='egg-script-container'>Script container</FieldLabel>
                                <Input
                                    id='egg-script-container'
                                    className='font-mono text-xs'
                                    aria-invalid={!!errors.script_container}
                                    {...form.register('script_container')}
                                />
                                <FieldDescription>
                                    Docker container to use when running this script for the server.
                                </FieldDescription>
                                <FieldError errors={[errors.script_container]} />
                            </Field>
                            <Field data-invalid={!!errors.script_entry}>
                                <FieldLabel htmlFor='egg-script-entry'>Script entrypoint command</FieldLabel>
                                <Input
                                    id='egg-script-entry'
                                    className='font-mono text-xs'
                                    aria-invalid={!!errors.script_entry}
                                    {...form.register('script_entry')}
                                />
                                <FieldDescription>The entrypoint command to use for this script.</FieldDescription>
                                <FieldError errors={[errors.script_entry]} />
                            </Field>
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
    );
};

export { EggInstallTab };
