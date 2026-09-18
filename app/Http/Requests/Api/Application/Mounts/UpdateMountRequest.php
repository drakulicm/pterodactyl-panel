<?php

namespace Pterodactyl\Http\Requests\Api\Application\Mounts;

use Pterodactyl\Models\Mount;

class UpdateMountRequest extends StoreMountRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        /** @var Mount $mount */
        $mount = $this->route()->parameter('mount');

        return Mount::getRulesForUpdate($mount->id);
    }
}
