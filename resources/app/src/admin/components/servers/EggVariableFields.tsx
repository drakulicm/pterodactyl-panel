import type { AdminServerVariable } from '@/admin/api/servers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const EggVariableFields: React.FC<{
    variables: AdminServerVariable[];
    values: Record<string, string>;
    onChange: (envVariable: string, value: string) => void;
}> = ({ variables, values, onChange }) => {
    if (variables.length === 0) {
        return (
            <p className='rounded-lg border p-3 text-sm text-muted-foreground'>
                This egg does not define any service variables.
            </p>
        );
    }

    return (
        <div className='grid gap-4 md:grid-cols-2'>
            {variables.map((variable) => (
                <Card key={variable.env_variable}>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                            {variable.rules.split('|').includes('required') && (
                                <Badge variant='destructive'>Required</Badge>
                            )}
                            {variable.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-2'>
                        <Field>
                            <FieldLabel htmlFor={`variable-${variable.env_variable}`} className='sr-only'>
                                {variable.name}
                            </FieldLabel>
                            <Input
                                id={`variable-${variable.env_variable}`}
                                value={values[variable.env_variable] ?? ''}
                                onChange={(event) => onChange(variable.env_variable, event.target.value)}
                            />
                            {variable.description && <FieldDescription>{variable.description}</FieldDescription>}
                        </Field>
                        <p className='text-xs text-muted-foreground'>
                            <strong>Startup command variable:</strong>{' '}
                            <code className='rounded bg-muted px-1 font-mono'>{variable.env_variable}</code>
                        </p>
                        <p className='text-xs text-muted-foreground'>
                            <strong>Input rules:</strong>{' '}
                            <code className='rounded bg-muted px-1 font-mono'>{variable.rules}</code>
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export { EggVariableFields };
