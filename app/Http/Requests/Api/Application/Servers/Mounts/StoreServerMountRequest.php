<?php

namespace Pterodactyl\Http\Requests\Api\Application\Servers\Mounts;

use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

class StoreServerMountRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'mount_id' => 'required|integer|exists:mounts,id',
        ];
    }
}
