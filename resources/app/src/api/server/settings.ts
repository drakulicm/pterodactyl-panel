import { http } from '@/lib/http';

interface RenameServerValues {
    name: string;
    description: string;
}

const renameServer = async (uuid: string, values: RenameServerValues): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/settings/rename`, values);
};

const reinstallServer = async (uuid: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/settings/reinstall`);
};

export { reinstallServer, renameServer };
export type { RenameServerValues };
