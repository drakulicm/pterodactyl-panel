<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Mounts;

use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;
use Illuminate\Http\Response;
use Pterodactyl\Models\Mount;
use Illuminate\Http\JsonResponse;
use Spatie\QueryBuilder\QueryBuilder;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Transformers\Api\Application\MountTransformer;
use Pterodactyl\Http\Requests\Api\Application\Mounts\GetMountRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\GetMountsRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\MountEggsRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\MountNodesRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\StoreMountRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\DeleteMountRequest;
use Pterodactyl\Http\Requests\Api\Application\Mounts\UpdateMountRequest;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;

class MountController extends ApplicationApiController
{
    /**
     * Return all the mounts currently registered on the Panel.
     */
    public function index(GetMountsRequest $request): array
    {
        $mounts = QueryBuilder::for(Mount::query()->withCount(['eggs', 'nodes', 'servers']))
            ->allowedFilters(['uuid', 'name', 'source', 'target'])
            ->allowedSorts(['id', 'name'])
            ->paginate($request->query('per_page') ?? 50);

        return $this->fractal->collection($mounts)
            ->transformWith($this->getTransformer(MountTransformer::class))
            ->toArray();
    }

    /**
     * Return a single mount.
     */
    public function view(GetMountRequest $request, Mount $mount): array
    {
        return $this->transform($mount);
    }

    /**
     * Store a new mount on the Panel.
     *
     * @throws \Throwable
     */
    public function store(StoreMountRequest $request): JsonResponse
    {
        $model = (new Mount())->fill($request->validated());
        $model->forceFill(['uuid' => Uuid::uuid4()->toString()]);
        $model->saveOrFail();

        $mount = $model->fresh()->loadCount(['eggs', 'nodes', 'servers']);

        return $this->fractal->item($mount)
            ->transformWith($this->getTransformer(MountTransformer::class))
            ->addMeta([
                'resource' => route('api.application.mounts.view', [
                    'mount' => $mount->id,
                ]),
            ])
            ->respond(201);
    }

    /**
     * Update a mount on the Panel and return the updated record.
     *
     * @throws \Throwable
     */
    public function update(UpdateMountRequest $request, Mount $mount): array
    {
        $mount->forceFill($request->validated())->saveOrFail();

        return $this->transform($mount->refresh());
    }

    /**
     * Delete a mount from the Panel, this is refused while servers are still using it.
     *
     * @throws DisplayException
     */
    public function delete(DeleteMountRequest $request, Mount $mount): Response
    {
        if ($mount->servers()->count() > 0) {
            throw new DisplayException('Cannot delete a mount that is currently attached to one or more servers.');
        }

        $mount->eggs()->detach();
        $mount->nodes()->detach();
        $mount->delete();

        return $this->returnNoContent();
    }

    /**
     * Adds eggs to the mount's many-to-many relation.
     */
    public function addEggs(MountEggsRequest $request, Mount $mount): array
    {
        $mount->eggs()->syncWithoutDetaching($request->validated()['eggs']);

        return $this->transform($mount);
    }

    /**
     * Adds nodes to the mount's many-to-many relation.
     */
    public function addNodes(MountNodesRequest $request, Mount $mount): array
    {
        $mount->nodes()->syncWithoutDetaching($request->validated()['nodes']);

        return $this->transform($mount);
    }

    /**
     * Deletes an egg from the mount's many-to-many relation.
     */
    public function deleteEgg(DeleteMountRequest $request, Mount $mount, Egg $egg): Response
    {
        $mount->eggs()->detach($egg->id);

        return $this->returnNoContent();
    }

    /**
     * Deletes a node from the mount's many-to-many relation.
     */
    public function deleteNode(DeleteMountRequest $request, Mount $mount, Node $node): Response
    {
        $mount->nodes()->detach($node->id);

        return $this->returnNoContent();
    }

    /**
     * Returns the transformed representation of a mount including the relationship counts.
     */
    private function transform(Mount $mount): array
    {
        return $this->fractal->item($mount->loadCount(['eggs', 'nodes', 'servers']))
            ->transformWith($this->getTransformer(MountTransformer::class))
            ->toArray();
    }
}
