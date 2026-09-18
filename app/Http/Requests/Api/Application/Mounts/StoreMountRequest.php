<?php

namespace Pterodactyl\Http\Requests\Api\Application\Mounts;

use Pterodactyl\Models\Mount;
use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

class StoreMountRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return Mount::getRules();
    }
}
