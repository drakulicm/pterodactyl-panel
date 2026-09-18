<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests;

use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Http\Requests\Api\Application\ApplicationApiRequest;

class StoreNestRequest extends ApplicationApiRequest
{
    protected ?string $resource = AdminAcl::RESOURCE_NESTS;

    protected int $permission = AdminAcl::WRITE;

    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|min:1|max:191|regex:/^[\w\- ]+$/',
            'description' => 'string|nullable',
        ];
    }

    /**
     * Return only the fields that the nest services expect to receive.
     */
    public function normalize(): array
    {
        return $this->only(array_keys($this->rules()));
    }
}
