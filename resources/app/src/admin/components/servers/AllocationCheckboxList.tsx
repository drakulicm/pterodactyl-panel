import { type AdminServerAllocation, formatAllocation } from '@/admin/api/servers';
import { Checkbox } from '@/components/ui/checkbox';

const AllocationCheckboxList: React.FC<{
    allocations: AdminServerAllocation[];
    selected: number[];
    emptyMessage: string;
    onChange: (selected: number[]) => void;
}> = ({ allocations, selected, emptyMessage, onChange }) => {
    if (allocations.length === 0) {
        return <p className='rounded-lg border p-3 text-sm text-muted-foreground'>{emptyMessage}</p>;
    }

    const handleToggle = (allocationId: number, isChecked: boolean) =>
        onChange(isChecked ? [...selected, allocationId] : selected.filter((id) => id !== allocationId));

    return (
        <div className='max-h-48 overflow-y-auto rounded-lg border'>
            {allocations.map((allocation) => (
                <label
                    key={allocation.id}
                    className='flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 ease hover:bg-muted/50'
                >
                    <Checkbox
                        checked={selected.includes(allocation.id)}
                        onCheckedChange={(isChecked) => handleToggle(allocation.id, isChecked === true)}
                    />
                    <code className='font-mono text-xs'>{formatAllocation(allocation)}</code>
                    {allocation.notes && <span className='text-xs text-muted-foreground'>{allocation.notes}</span>}
                </label>
            ))}
        </div>
    );
};

export { AllocationCheckboxList };
