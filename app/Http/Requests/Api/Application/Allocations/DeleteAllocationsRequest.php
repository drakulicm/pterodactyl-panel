<?php

namespace Pterodactyl\Http\Requests\Api\Application\Allocations;

class DeleteAllocationsRequest extends DeleteAllocationRequest
{
    /**
     * Rules to validate the request against. Either a list of allocation
     * identifiers or an IP address must be provided, but not both.
     */
    public function rules(): array
    {
        return [
            'ids' => 'required_without:ip|prohibits:ip|array|min:1',
            'ids.*' => 'integer|distinct',
            'ip' => 'required_without:ids|string|ip',
        ];
    }
}
