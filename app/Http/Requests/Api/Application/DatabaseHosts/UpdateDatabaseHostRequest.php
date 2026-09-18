<?php

namespace Pterodactyl\Http\Requests\Api\Application\DatabaseHosts;

use Pterodactyl\Models\DatabaseHost;

class UpdateDatabaseHostRequest extends StoreDatabaseHostRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        /** @var DatabaseHost $host */
        $host = $this->route()->parameter('host');

        return DatabaseHost::getRulesForUpdate($host->id);
    }
}
