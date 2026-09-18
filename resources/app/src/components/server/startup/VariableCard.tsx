import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { serverQueryOptions } from '@/api/server/server';
import { serverStartupQueryOptions, updateStartupVariable } from '@/api/server/startup';
import type { ServerEggVariable } from '@/api/server/types';
import { FormError } from '@/components/auth/FormError';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const SAVE_DEBOUNCE_MS = 500;
const SWITCH_RULES = ['boolean', 'in:0,1', 'in:1,0', 'in:true,false', 'in:false,true'];

const VariableCard: React.FC<{
    variable: ServerEggVariable;
}> = ({ variable }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [value, setValue] = useState(variable.serverValue ?? '');
    const timeout = useRef<number | undefined>(undefined);

    const canEdit = hasPermission(permissions, 'startup.update') && variable.isEditable;
    const isSwitch = variable.rules.some((rule) => SWITCH_RULES.includes(rule));
    const isStringSwitch = variable.rules.includes('string');
    const selectValues =
        variable.rules
            .find((rule) => rule.startsWith('in:'))
            ?.slice(3)
            .split(',') ?? [];
    const checkedValue = isStringSwitch ? 'true' : '1';
    const uncheckedValue = isStringSwitch ? 'false' : '0';

    const update = useMutation({
        mutationFn: (next: string) => updateStartupVariable(server.uuid, variable.envVariable, next),
        onSuccess: ({ variable: updated, invocation }) => {
            queryClient.setQueryData(serverStartupQueryOptions(server.uuid).queryKey, (data) =>
                data
                    ? {
                          ...data,
                          invocation,
                          variables: data.variables.map((item) =>
                              item.envVariable === updated.envVariable ? updated : item,
                          ),
                      }
                    : data,
            );
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
        },
        onError: () => setValue(variable.serverValue ?? ''),
    });

    useEffect(() => () => window.clearTimeout(timeout.current), []);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.value;
        setValue(next);
        window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => update.mutate(next), SAVE_DEBOUNCE_MS);
    };

    const handleImmediateChange = (next: string) => {
        setValue(next);
        update.mutate(next);
    };

    const handleCheckedChange = (checked: boolean) => handleImmediateChange(checked ? checkedValue : uncheckedValue);

    const handleSelectChange = (next: string | null) => {
        if (next === null) {
            return;
        }

        handleImmediateChange(next);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex flex-wrap items-center gap-2'>
                    {variable.name}
                    {!variable.isEditable && <Badge variant='secondary'>Read only</Badge>}
                    {update.isPending && <Spinner />}
                </CardTitle>
                <CardDescription>
                    <code className='font-mono text-xs'>{variable.envVariable}</code>
                </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
                <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                {isSwitch ? (
                    <Switch
                        aria-label={variable.name}
                        checked={value === checkedValue}
                        disabled={!canEdit}
                        onCheckedChange={handleCheckedChange}
                    />
                ) : selectValues.length > 0 ? (
                    <Select
                        value={value || variable.defaultValue}
                        disabled={!canEdit}
                        onValueChange={handleSelectChange}
                    >
                        <SelectTrigger className='w-full' aria-label={variable.name}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {selectValues.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input
                        aria-label={variable.name}
                        name={variable.envVariable}
                        value={value}
                        placeholder={variable.defaultValue}
                        readOnly={!canEdit}
                        onChange={handleInputChange}
                    />
                )}
                <p className='text-xs whitespace-pre-line text-muted-foreground'>{variable.description}</p>
            </CardContent>
        </Card>
    );
};

export { VariableCard };
