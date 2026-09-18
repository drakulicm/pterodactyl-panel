const EXAMPLES = [
    ['*/5 * * * *', 'every 5 minutes'],
    ['0 */1 * * *', 'every hour'],
    ['0 8-12 * * *', 'hour range'],
    ['0 0 * * *', 'once a day'],
    ['0 0 * * MON', 'every Monday'],
] as const;

const SPECIAL_CHARACTERS = [
    ['*', 'any value'],
    [',', 'value list separator'],
    ['-', 'range values'],
    ['/', 'step values'],
] as const;

const CheatsheetTable: React.FC<{
    title: string;
    rows: readonly (readonly [string, string])[];
}> = ({ title, rows }) => {
    return (
        <div className='flex flex-col overflow-hidden rounded-lg border'>
            <span className='px-3 py-2 text-xs font-medium'>{title}</span>
            {rows.map(([expression, meaning]) => (
                <div key={expression} className='grid grid-cols-2 gap-2 px-3 py-1.5 text-xs odd:bg-muted/50'>
                    <code className='font-mono'>{expression}</code>
                    <span className='text-muted-foreground'>{meaning}</span>
                </div>
            ))}
        </div>
    );
};

const ScheduleCheatsheet: React.FC = () => {
    return (
        <div className='grid gap-3 sm:grid-cols-2'>
            <CheatsheetTable title='Examples' rows={EXAMPLES} />
            <CheatsheetTable title='Special characters' rows={SPECIAL_CHARACTERS} />
        </div>
    );
};

export { ScheduleCheatsheet };
