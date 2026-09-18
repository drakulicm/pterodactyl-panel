<?php

namespace Pterodactyl\Http\Requests\Api\Application\Servers;

class TransferServerRequest extends ServerWriteRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'node_id' => 'required|integer|exists:nodes,id',
            'allocation_id' => 'required|bail|integer|unique:servers|exists:allocations,id',
            'allocation_additional' => 'nullable|array',
            'allocation_additional.*' => 'integer|distinct|exists:allocations,id',
        ];
    }
}
