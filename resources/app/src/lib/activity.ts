const ACTIVITY_STRINGS: Record<string, string> = {
    'auth.fail': 'Failed log in',
    'auth.success': 'Logged in',
    'auth.password-reset': 'Password reset',
    'auth.reset-password': 'Requested password reset',
    'auth.checkpoint': 'Two-factor authentication requested',
    'auth.recovery-token': 'Used two-factor recovery token',
    'auth.token': 'Solved two-factor challenge',
    'auth.ip-blocked': 'Blocked request from unlisted IP address for :identifier',
    'auth.sftp.fail': 'Failed SFTP log in',
    'user.user.create': 'Created a new user :email',
    'user.account.email-changed': 'Changed email from :old to :new',
    'user.account.password-changed': 'Changed password',
    'user.api-key.create': 'Created new API key :identifier',
    'user.api-key.delete': 'Deleted API key :identifier',
    'user.ssh-key.create': 'Added SSH key :fingerprint to account',
    'user.ssh-key.delete': 'Removed SSH key :fingerprint from account',
    'user.two-factor.create': 'Enabled two-factor auth',
    'user.two-factor.delete': 'Disabled two-factor auth',
    'server.reinstall': 'Reinstalled server',
    'server.console.command': 'Executed ":command" on the server',
    'server.power.start': 'Started the server',
    'server.power.stop': 'Stopped the server',
    'server.power.restart': 'Restarted the server',
    'server.power.kill': 'Killed the server process',
    'server.backup.download': 'Downloaded the :name backup',
    'server.backup.delete': 'Deleted the :name backup',
    'server.backup.restore': 'Restored the :name backup (deleted files: :truncate)',
    'server.backup.restore-complete': 'Completed restoration of the :name backup',
    'server.backup.restore-failed': 'Failed to complete restoration of the :name backup',
    'server.backup.start': 'Started a new backup :name',
    'server.backup.complete': 'Marked the :name backup as complete',
    'server.backup.fail': 'Marked the :name backup as failed',
    'server.backup.lock': 'Locked the :name backup',
    'server.backup.unlock': 'Unlocked the :name backup',
    'server.database.create': 'Created new database :name',
    'server.database.rotate-password': 'Password rotated for database :name',
    'server.database.delete': 'Deleted database :name',
    'server.file.compress_one': 'Compressed :directory:files.0',
    'server.file.compress_other': 'Compressed :count files in :directory',
    'server.file.read': 'Viewed the contents of :file',
    'server.file.copy': 'Created a copy of :file',
    'server.file.create-directory': 'Created directory :directory:name',
    'server.file.decompress': 'Decompressed :files in :directory',
    'server.file.delete_one': 'Deleted :directory:files.0',
    'server.file.delete_other': 'Deleted :count files in :directory',
    'server.file.download': 'Downloaded :file',
    'server.file.pull': 'Downloaded a remote file from :url to :directory',
    'server.file.rename_one': 'Renamed :directory:files.0.from to :directory:files.0.to',
    'server.file.rename_other': 'Renamed :count files in :directory',
    'server.file.write': 'Wrote new content to :file',
    'server.file.upload': 'Began a file upload',
    'server.file.uploaded': 'Uploaded :directory:file',
    'server.sftp.denied': 'Blocked SFTP access due to permissions',
    'server.sftp.create_one': 'Created :files.0',
    'server.sftp.create_other': 'Created :count new files',
    'server.sftp.write_one': 'Modified the contents of :files.0',
    'server.sftp.write_other': 'Modified the contents of :count files',
    'server.sftp.delete_one': 'Deleted :files.0',
    'server.sftp.delete_other': 'Deleted :count files',
    'server.sftp.create-directory_one': 'Created the :files.0 directory',
    'server.sftp.create-directory_other': 'Created :count directories',
    'server.sftp.rename_one': 'Renamed :files.0.from to :files.0.to',
    'server.sftp.rename_other': 'Renamed or moved :count files',
    'server.allocation.create': 'Added :allocation to the server',
    'server.allocation.notes': 'Updated the notes for :allocation from ":old" to ":new"',
    'server.allocation.primary': 'Set :allocation as the primary server allocation',
    'server.allocation.delete': 'Deleted the :allocation allocation',
    'server.schedule.create': 'Created the :name schedule',
    'server.schedule.update': 'Updated the :name schedule',
    'server.schedule.execute': 'Manually executed the :name schedule',
    'server.schedule.delete': 'Deleted the :name schedule',
    'server.task.create': 'Created a new ":action" task for the :name schedule',
    'server.task.update': 'Updated the ":action" task for the :name schedule',
    'server.task.delete': 'Deleted a task for the :name schedule',
    'server.settings.rename': 'Renamed the server from :old to :new',
    'server.settings.description': 'Changed the server description from :old to :new',
    'server.startup.edit': 'Changed the :variable variable from ":old" to ":new"',
    'server.startup.image': 'Updated the Docker Image for the server from :old to :new',
    'server.subuser.create': 'Added :email as a subuser',
    'server.subuser.update': 'Updated the subuser permissions for :email',
    'server.subuser.delete': 'Removed :email as a subuser',
};

const TOKEN_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)*)/g;

type ActivitySegment = { text: string; isHighlighted: boolean };

const resolveTemplate = (event: string, properties: Record<string, unknown>): string | null => {
    const key = event.replace(':', '.');
    const count = properties.count;

    if (typeof count === 'number') {
        const plural = ACTIVITY_STRINGS[`${key}${count === 1 ? '_one' : '_other'}`];
        if (plural !== undefined) {
            return plural;
        }
    }

    return ACTIVITY_STRINGS[key] ?? null;
};

const resolvePath = (properties: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((value, segment) => {
        if (value === null || typeof value !== 'object') {
            return undefined;
        }

        return (value as Record<string, unknown>)[segment];
    }, properties);

const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) {
        return value.map(formatValue).join(', ');
    }

    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

const describeActivity = (event: string, properties: Record<string, unknown> = {}): ActivitySegment[] => {
    const template = resolveTemplate(event, properties);

    if (template === null) {
        return [{ text: event, isHighlighted: false }];
    }

    const segments: ActivitySegment[] = [];
    let cursor = 0;

    for (const match of template.matchAll(TOKEN_PATTERN)) {
        const path = match[1];
        if (path === undefined || match.index === undefined) {
            continue;
        }

        const value = resolvePath(properties, path);
        if (value === undefined) {
            continue;
        }

        if (match.index > cursor) {
            segments.push({ text: template.slice(cursor, match.index), isHighlighted: false });
        }

        const isCount = path === 'count' || path.endsWith('_count');
        segments.push({ text: formatValue(value), isHighlighted: !isCount });
        cursor = match.index + match[0].length;
    }

    if (cursor < template.length) {
        segments.push({ text: template.slice(cursor), isHighlighted: false });
    }

    return segments.filter((segment) => segment.text !== '');
};

export { describeActivity };
export type { ActivitySegment };
