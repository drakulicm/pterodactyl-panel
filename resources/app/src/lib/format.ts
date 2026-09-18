const UNITS = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'] as const;

const bytesToString = (bytes: number, decimals = 2): string => {
    if (bytes < 1) {
        return '0 Bytes';
    }

    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
    const value = Number((bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : decimals));

    return `${value} ${UNITS[index]}`;
};

const mbToBytes = (megabytes: number): number => Math.floor(megabytes * 1024 * 1024);

const formatIp = (ip: string): string => (/([a-f0-9:]+:+)+[a-f0-9]+/.test(ip) ? `[${ip}]` : ip);

const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    return `${hours}h ${minutes}m ${seconds % 60}s`;
};

export { bytesToString, formatIp, formatUptime, mbToBytes };
