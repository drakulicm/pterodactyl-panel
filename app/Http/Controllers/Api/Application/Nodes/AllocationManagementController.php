<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Nodes;

use Pterodactyl\Models\Node;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Transformers\Api\Application\AllocationTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Allocations\UpdateAllocationRequest;
use Pterodactyl\Http\Requests\Api\Application\Allocations\DeleteAllocationsRequest;

class AllocationManagementController extends ApplicationApiController
{
    /**
     * Sets the IP alias for a specific allocation on a node.
     */
    public function update(UpdateAllocationRequest $request, Node $node, Allocation $allocation): array
    {
        $alias = $request->input('ip_alias');

        $allocation->forceFill(['ip_alias' => empty($alias) ? null : $alias])->save();

        return $this->fractal->item($allocation)
            ->transformWith($this->getTransformer(AllocationTransformer::class))
            ->toArray();
    }

    /**
     * Removes multiple allocations from a node at once, either by their identifiers or
     * every allocation for a given IP address. Allocations that are assigned to a server
     * are never removed, the number of allocations that were deleted is returned.
     */
    public function delete(DeleteAllocationsRequest $request, Node $node): JsonResponse
    {
        $query = Allocation::query()->where('node_id', $node->id)->whereNull('server_id');

        if ($request->filled('ip')) {
            $query->where('ip', $request->input('ip'));
        } else {
            $query->whereIn('id', $request->input('ids'));
        }

        return new JsonResponse(['deleted' => $query->delete()]);
    }
}
