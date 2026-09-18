<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\MountServer;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Repositories\Eloquent\MountRepository;
use Pterodactyl\Transformers\Api\Application\MountTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Servers\Mounts\GetServerMountsRequest;
use Pterodactyl\Http\Requests\Api\Application\Servers\Mounts\StoreServerMountRequest;
use Pterodactyl\Http\Requests\Api\Application\Servers\Mounts\DeleteServerMountRequest;

class ServerMountController extends ApplicationApiController
{
    /**
     * ServerMountController constructor.
     */
    public function __construct(private MountRepository $repository)
    {
        parent::__construct();
    }

    /**
     * Returns every mount that is available to the server (matching egg and node), the
     * identifiers of those currently mounted are returned in the response metadata.
     */
    public function index(GetServerMountsRequest $request, Server $server): array
    {
        return $this->transform($server);
    }

    /**
     * Adds a mount to a server.
     *
     * @throws \Throwable
     */
    public function store(StoreServerMountRequest $request, Server $server): array
    {
        $mountId = (int) $request->validated()['mount_id'];

        if (!$this->repository->getMountListForServer($server)->contains('id', $mountId)) {
            throw new DisplayException('This mount is not available to the egg and node used by this server.');
        }

        if (!in_array($mountId, $this->mounted($server))) {
            (new MountServer())->forceFill([
                'mount_id' => $mountId,
                'server_id' => $server->id,
            ])->saveOrFail();
        }

        return $this->transform($server);
    }

    /**
     * Removes a mount from a server.
     */
    public function delete(DeleteServerMountRequest $request, Server $server, Mount $mount): Response
    {
        MountServer::query()->where('mount_id', $mount->id)->where('server_id', $server->id)->delete();

        return $this->returnNoContent();
    }

    /**
     * Returns the transformed list of mounts available to a server.
     */
    private function transform(Server $server): array
    {
        return $this->fractal->collection($this->repository->getMountListForServer($server))
            ->transformWith($this->getTransformer(MountTransformer::class))
            ->addMeta(['mounted' => $this->mounted($server)])
            ->toArray();
    }

    /**
     * Returns the identifiers of all the mounts that are attached to the server.
     *
     * @return int[]
     */
    private function mounted(Server $server): array
    {
        return MountServer::query()->where('server_id', $server->id)->pluck('mount_id')
            ->map(fn ($id) => (int) $id)->values()->all();
    }
}
