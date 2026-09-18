<?php

namespace Pterodactyl\Http\Requests\Api\Application\Mounts;

use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

class MountEggsRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'eggs' => 'required|array|min:1',
            'eggs.*' => 'integer|distinct|exists:eggs,id',
        ];
    }
}
