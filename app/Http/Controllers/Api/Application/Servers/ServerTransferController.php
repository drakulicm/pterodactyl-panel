<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Servers;

use Carbon\CarbonImmutable;
use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Enum\JwtScope;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\ServerTransfer;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Nodes\NodeJWTService;
use Pterodactyl\Repositories\Eloquent\NodeRepository;
use Pterodactyl\Repositories\Wings\DaemonTransferRepository;
use Pterodactyl\Http\Requests\Api\Application\Servers\TransferServerRequest;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;

class ServerTransferController extends ApplicationApiController
{
    /**
     * ServerTransferController constructor.
     */
    public function __construct(
        private ConnectionInterface $connection,
        private DaemonTransferRepository $daemonTransferRepository,
        private NodeJWTService $nodeJWTService,
        private NodeRepository $nodeRepository,
    ) {
        parent::__construct();
    }

    /**
     * Starts a transfer of a server to a new node.
     *
     * @throws \Throwable
     */
    public function __invoke(TransferServerRequest $request, Server $server): Response
    {
        $data = $request->validated();

        $nodeId = (int) $data['node_id'];
        $allocationId = (int) $data['allocation_id'];
        $additional = array_map('intval', $data['allocation_additional'] ?? []);

        if ($nodeId === $server->node_id) {
            throw new DisplayException('A server cannot be transferred to the node it is already running on.');
        }

        // Every allocation must exist on the target node and must not be in use.
        $allocations = array_values(array_unique(array_merge([$allocationId], $additional)));
        $available = Allocation::query()
            ->where('node_id', $nodeId)
            ->whereNull('server_id')
            ->whereIn('id', $allocations)
            ->count();

        if ($available !== count($allocations)) {
            throw new DisplayException('One or more of the selected allocations do not exist on the target node or are already assigned to a server.');
        }

        // Check if the node is viable for the transfer.
        $node = $this->nodeRepository->getNodeWithResourceUsage($nodeId);
        if (!$node->isViable($server->memory, $server->disk)) {
            throw new DisplayException(trans('admin/server.alerts.transfer_not_viable'));
        }

        $server->validateTransferState();

        $this->connection->transaction(function () use ($server, $nodeId, $allocationId, $additional, $allocations) {
            // Create a new ServerTransfer entry.
            $transfer = new ServerTransfer();

            $transfer->server_id = $server->id;
            $transfer->old_node = $server->node_id;
            $transfer->new_node = $nodeId;
            $transfer->old_allocation = $server->allocation_id;
            $transfer->new_allocation = $allocationId;
            $transfer->old_additional_allocations = $server->allocations->where('id', '!=', $server->allocation_id)->pluck('id')->values()->toArray();
            $transfer->new_additional_allocations = $additional;

            $transfer->save();

            // Add the allocations to the server, so they cannot be automatically assigned while the transfer is in progress.
            Allocation::query()->whereIn('id', $allocations)->update(['server_id' => $server->id]);

            // Generate a token for the destination node that the source node can use to authenticate with.
            $token = $this->nodeJWTService
                ->setExpiresAt(CarbonImmutable::now()->addMinutes(15))
                ->setSubject($server->uuid)
                ->setScopes(JwtScope::ServerTransfer)
                ->handle($transfer->newNode, $server->uuid);

            // Notify the source node of the pending outgoing transfer.
            $this->daemonTransferRepository->setServer($server)->notify($transfer->newNode, $token);
        });

        return new Response('', Response::HTTP_ACCEPTED);
    }
}
