<?php

namespace Pterodactyl\Http\Requests\Api\Application\Mounts;

use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

class MountNodesRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'nodes' => 'required|array|min:1',
            'nodes.*' => 'integer|distinct|exists:nodes,id',
        ];
    }
}
