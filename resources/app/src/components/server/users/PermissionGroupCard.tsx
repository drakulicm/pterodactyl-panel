import type { PermissionGroup } from '@/api/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PermissionGroupCard: React.FC<{
    groupKey: string;
    group: PermissionGroup;
    selected: string[];
    editablePermissions: string[];
    isEditable: boolean;
    onChange: (permissions: string[]) => void;
}> = ({ groupKey, group, selected, editablePermissions, isEditable, onChange }) => {
    const groupPermissions = Object.keys(group.keys).map((key) => `${groupKey}.${key}`);
    const grantable = groupPermissions.filter((permission) => editablePermissions.includes(permission));
    const isAllSelected = grantable.length > 0 && grantable.every((permission) => selected.includes(permission));
    const isSomeSelected = grantable.some((permission) => selected.includes(permission));

    const handleToggleAll = (isChecked: boolean) => {
        if (isChecked) {
            onChange([...selected, ...grantable.filter((permission) => !selected.includes(permission))]);

            return;
        }

        onChange(selected.filter((permission) => !grantable.includes(permission)));
    };

    const handleToggle = (permission: string, isChecked: boolean) => {
        onChange(isChecked ? [...selected, permission] : selected.filter((value) => value !== permission));
    };

    return (
        <div className='flex flex-col rounded-lg border'>
            <div className='flex items-center gap-3 border-b bg-muted/50 px-3 py-2'>
                <span className='flex-1 text-xs font-medium tracking-wide uppercase'>{groupKey}</span>
                {isEditable && grantable.length > 0 && (
                    <Checkbox
                        aria-label={`Select all ${groupKey} permissions`}
                        checked={isAllSelected}
                        indeterminate={!isAllSelected && isSomeSelected}
                        onCheckedChange={handleToggleAll}
                    />
                )}
            </div>
            <div className='flex flex-col gap-1 p-3'>
                <p className='pb-2 text-xs text-muted-foreground'>{group.description}</p>
                {Object.entries(group.keys).map(([key, description]) => {
                    const permission = `${groupKey}.${key}`;
                    const isDisabled = !isEditable || !editablePermissions.includes(permission);
                    const id = `permission-${permission}`;

                    return (
                        <div
                            key={permission}
                            className={cn(
                                'flex items-start gap-3 rounded-md p-2 transition-colors duration-150 ease',
                                isDisabled ? 'opacity-50' : 'hover:bg-muted/50',
                            )}
                        >
                            <Checkbox
                                id={id}
                                className='mt-0.5'
                                disabled={isDisabled}
                                checked={selected.includes(permission)}
                                onCheckedChange={(isChecked) => handleToggle(permission, isChecked)}
                            />
                            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                                <Label htmlFor={id} className='font-mono text-xs'>
                                    {key}
                                </Label>
                                {description.length > 0 && (
                                    <span className='text-xs text-muted-foreground'>{description}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export { PermissionGroupCard };
