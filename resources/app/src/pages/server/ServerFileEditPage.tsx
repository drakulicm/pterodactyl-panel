import { LanguageDescription, type LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { githubDark } from '@uiw/codemirror-theme-github';
import CodeMirror, { keymap } from '@uiw/react-codemirror';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { fileContentsQueryOptions, saveFileContents } from '@/api/server/files';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileBreadcrumbs } from '@/components/server/files/FileBreadcrumbs';
import { InputDialog, moveHint } from '@/components/server/files/FileDialogs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { basename, dirname, hashToPath, joinPath, pathToHash } from '@/lib/paths';
import { hasPermission } from '@/lib/permissions';

const ServerFileEditPage: React.FC<{
    mode: 'edit' | 'new';
}> = ({ mode }) => {
    const { server, permissions } = useServer();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const hash = useLocation({ select: (location) => location.hash });
    const path = hashToPath(hash);
    const directory = mode === 'edit' ? dirname(path) : path;
    const fileName = mode === 'edit' ? basename(path) : undefined;
    const draftKey = `pterodactyl:new-file:${server.uuid}:${directory}`;

    const [content, setContent] = useState(() => (mode === 'new' ? (sessionStorage.getItem(draftKey) ?? '') : ''));
    const [language, setLanguage] = useState<LanguageSupport | null>(null);
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const latestContent = useRef(content);

    const file = useQuery({ ...fileContentsQueryOptions(server.uuid, path), enabled: mode === 'edit' });
    const canSave = hasPermission(permissions, mode === 'edit' ? 'file.update' : 'file.create');

    useEffect(() => {
        if (file.data !== undefined) {
            setContent(file.data);
        }
    }, [file.data]);

    useEffect(() => {
        latestContent.current = content;
        if (mode === 'new') {
            sessionStorage.setItem(draftKey, content);
        }
    }, [content, mode, draftKey]);

    useEffect(() => {
        const description = fileName ? LanguageDescription.matchFilename(languages, fileName) : null;
        if (!description) {
            setLanguage(null);
            return;
        }

        let isActive = true;
        description.load().then((support) => isActive && setLanguage(support));

        return () => {
            isActive = false;
        };
    }, [fileName]);

    const save = useMutation({
        mutationFn: (name?: string) =>
            saveFileContents(server.uuid, name ? joinPath(directory, name) : path, latestContent.current),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({ queryKey: ['server', server.uuid, 'files'] });
            if (!name) {
                toast.success('File saved.');
                return;
            }

            sessionStorage.removeItem(draftKey);
            navigate({
                to: '/server/$id/files/edit',
                params: { id: server.id },
                hash: pathToHash(joinPath(directory, name)),
            });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleSave = () => {
        if (!canSave) {
            return;
        }

        if (mode === 'new') {
            setIsNameDialogOpen(true);
            return;
        }

        save.mutate(undefined);
    };

    const saveHandler = useRef(handleSave);
    saveHandler.current = handleSave;

    const extensions = useMemo(
        () => [
            keymap.of([
                {
                    key: 'Mod-s',
                    run: () => {
                        saveHandler.current();

                        return true;
                    },
                },
            ]),
            ...(language ? [language] : []),
        ],
        [language],
    );

    return (
        <>
            <PageHeader title={mode === 'edit' ? 'Edit file' : 'New file'}>
                <Button
                    size='sm'
                    variant='outline'
                    render={<Link to='/server/$id/files' params={{ id: server.id }} hash={pathToHash(directory)} />}
                >
                    Back
                </Button>
                {canSave && (
                    <Button size='sm' disabled={save.isPending || (mode === 'edit' && file.isPending)} onClick={handleSave}>
                        {save.isPending && <Spinner />}
                        {mode === 'edit' ? 'Save' : 'Create file'}
                    </Button>
                )}
            </PageHeader>
            <div className='flex min-h-0 flex-1 flex-col gap-4 p-4'>
                <FileBreadcrumbs directory={directory} fileName={fileName ?? 'new file'} />
                <FormError message={file.error ? httpErrorToHuman(file.error) : null} />
                {fileName === '.pteroignore' && (
                    <Alert>
                        <AlertDescription>
                            You&apos;re editing a .pteroignore file. Any files or directories listed here will be excluded
                            from backups. Wildcards are supported with an asterisk (*), and a rule can be negated with a
                            leading exclamation point (!).
                        </AlertDescription>
                    </Alert>
                )}
                {mode === 'edit' && file.isPending ? (
                    <Skeleton className='min-h-96 flex-1 rounded-xl' />
                ) : (
                    !file.error && (
                        <div className='min-h-96 flex-1 overflow-hidden rounded-xl border'>
                            <CodeMirror
                                value={content}
                                theme={githubDark}
                                height='100%'
                                className='h-full text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono'
                                readOnly={!canSave}
                                extensions={extensions}
                                onChange={setContent}
                            />
                        </div>
                    )
                )}
            </div>
            <InputDialog
                isOpen={isNameDialogOpen}
                title='Create file'
                label='File name'
                initialValue=''
                hint={(value) => moveHint(directory)(value).replace('New location', 'This file will be created as')}
                submitLabel='Create file'
                isPending={save.isPending}
                onSubmit={(name) => save.mutate(name, { onSuccess: () => setIsNameDialogOpen(false) })}
                onClose={() => setIsNameDialogOpen(false)}
            />
        </>
    );
};

const ServerFileEditRoutePage: React.FC = () => <ServerFileEditPage mode='edit' />;

const ServerFileNewRoutePage: React.FC = () => <ServerFileEditPage mode='new' />;

export { ServerFileEditRoutePage, ServerFileNewRoutePage };
