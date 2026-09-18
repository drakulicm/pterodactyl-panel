<?php

namespace Pterodactyl\Http\Requests\Api\Application\DatabaseHosts;

use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Http\Requests\Api\Application\ApplicationApiRequest;

class StoreDatabaseHostRequest extends ApplicationApiRequest
{
    protected ?string $resource = AdminAcl::RESOURCE_DATABASE_HOSTS;

    protected int $permission = AdminAcl::WRITE;

    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return DatabaseHost::getRules();
    }

    /**
     * Ensure a node_id key is always present so that a host can be unlinked from a node.
     */
    protected function prepareForValidation(): void
    {
        if (!$this->filled('node_id')) {
            $this->merge(['node_id' => null]);
        }
    }

    /**
     * Return only the fields that the host services expect to receive.
     */
    public function normalize(): array
    {
        return $this->only(array_keys($this->rules()));
    }
}
