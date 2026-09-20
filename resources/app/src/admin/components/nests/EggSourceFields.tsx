import { LinkIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';

import { type EggImportSource, toEggImportUrl } from '@/admin/api/nests';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EggSourceMode = 'file' | 'url';

const EggSourceFields: React.FC<{
    idPrefix: string;
    onChange: (source: EggImportSource | null) => void;
}> = ({ idPrefix, onChange }) => {
    const [mode, setMode] = useState<EggSourceMode>('url');
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');

    const resolve = (nextMode: EggSourceMode, nextFile: File | null, nextUrl: string): EggImportSource | null => {
        if (nextMode === 'file') {
            return nextFile ? { file: nextFile } : null;
        }

        const importUrl = toEggImportUrl(nextUrl);

        return importUrl ? { url: importUrl } : null;
    };

    const handleModeChange = (value: string) => {
        const nextMode = value === 'file' ? 'file' : 'url';
        setMode(nextMode);
        setFile(null);
        onChange(resolve(nextMode, null, url));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null;
        setFile(nextFile);
        onChange(resolve(mode, nextFile, url));
    };

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
        onChange(resolve(mode, file, event.target.value));
    };

    const hasInvalidUrl = url.trim().length > 0 && !toEggImportUrl(url);

    return (
        <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className='w-full'>
                <TabsTrigger value='url'>
                    <LinkIcon />
                    From URL
                </TabsTrigger>
                <TabsTrigger value='file'>
                    <UploadIcon />
                    Upload file
                </TabsTrigger>
            </TabsList>
            <TabsContent value='url'>
                <Field data-invalid={hasInvalidUrl || undefined}>
                    <FieldLabel htmlFor={`${idPrefix}-url`}>Egg URL</FieldLabel>
                    <Input
                        id={`${idPrefix}-url`}
                        type='url'
                        inputMode='url'
                        autoComplete='off'
                        spellCheck={false}
                        placeholder='https://github.com/owner/repo/blob/main/egg-name.json'
                        value={url}
                        aria-invalid={hasInvalidUrl || undefined}
                        onChange={handleUrlChange}
                    />
                    {hasInvalidUrl ? (
                        <FieldError>Enter a full http:// or https:// link to the egg file.</FieldError>
                    ) : (
                        <FieldDescription>
                            Paste a link to an egg&apos;s JSON file. Links to a file on GitHub or in a Gist work as
                            they appear in the browser, and the raw file is fetched by the panel.
                        </FieldDescription>
                    )}
                </Field>
            </TabsContent>
            <TabsContent value='file'>
                <Field>
                    <FieldLabel htmlFor={`${idPrefix}-file`}>Egg file</FieldLabel>
                    <Input id={`${idPrefix}-file`} type='file' accept='application/json' onChange={handleFileChange} />
                    <FieldDescription>Select the exported .json file for the egg.</FieldDescription>
                </Field>
            </TabsContent>
        </Tabs>
    );
};

export { EggSourceFields };
