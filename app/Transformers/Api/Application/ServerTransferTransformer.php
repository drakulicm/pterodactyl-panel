<?php

namespace Pterodactyl\Transformers\Api\Application;

use Pterodactyl\Models\ServerTransfer;

class ServerTransferTransformer extends BaseTransformer
{
    /**
     * Return the resource name for the JSONAPI output.
     */
    public function getResourceName(): string
    {
        return ServerTransfer::RESOURCE_NAME;
    }

    /**
     * Transform a transfer into a representation that can be consumed by the api.
     */
    public function transform(ServerTransfer $transfer): array
    {
        return [
            'id' => $transfer->id,
            'server_id' => $transfer->server_id,
            'old_node' => $transfer->old_node,
            'new_node' => $transfer->new_node,
            'old_allocation' => $transfer->old_allocation,
            'new_allocation' => $transfer->new_allocation,
            'old_additional_allocations' => $transfer->old_additional_allocations,
            'new_additional_allocations' => $transfer->new_additional_allocations,
            'successful' => (bool) $transfer->successful,
            'archived' => (bool) $transfer->archived,
            $transfer->getCreatedAtColumn() => $this->formatTimestamp($transfer->created_at),
            $transfer->getUpdatedAtColumn() => $this->formatTimestamp($transfer->updated_at),
        ];
    }
}
