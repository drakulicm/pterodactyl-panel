<?php

namespace Pterodactyl\Transformers\Api\Application;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Server;
use League\Fractal\Resource\Collection;
use League\Fractal\Resource\NullResource;
use Pterodactyl\Services\Acl\Api\AdminAcl;

class MountTransformer extends BaseTransformer
{
    /**
     * Relationships that can be loaded onto this transformation.
     */
    protected array $availableIncludes = ['eggs', 'nodes', 'servers'];

    /**
     * Return the resource name for the JSONAPI output.
     */
    public function getResourceName(): string
    {
        return Mount::RESOURCE_NAME;
    }

    /**
     * Transform a Mount model into a representation for the application API.
     */
    public function transform(Mount $model): array
    {
        $response = [
            'id' => $model->id,
            'uuid' => $model->uuid,
            'name' => $model->name,
            'description' => $model->description,
            'source' => $model->source,
            'target' => $model->target,
            'read_only' => $model->read_only,
            'user_mountable' => $model->user_mountable,
        ];

        // Only present when the counts were loaded onto the model (listing & view endpoints).
        foreach (['eggs_count', 'nodes_count', 'servers_count'] as $count) {
            if (!is_null($model->getAttribute($count))) {
                $response[$count] = (int) $model->getAttribute($count);
            }
        }

        return $response;
    }

    /**
     * Include the eggs that this mount can be used with.
     *
     * @throws \Pterodactyl\Exceptions\Transformer\InvalidTransformerLevelException
     */
    public function includeEggs(Mount $model): Collection|NullResource
    {
        if (!$this->authorize(AdminAcl::RESOURCE_EGGS)) {
            return $this->null();
        }

        $model->loadMissing('eggs');

        return $this->collection($model->getRelation('eggs'), $this->makeTransformer(EggTransformer::class), Egg::RESOURCE_NAME);
    }

    /**
     * Include the nodes that this mount can be used on.
     *
     * @throws \Pterodactyl\Exceptions\Transformer\InvalidTransformerLevelException
     */
    public function includeNodes(Mount $model): Collection|NullResource
    {
        if (!$this->authorize(AdminAcl::RESOURCE_NODES)) {
            return $this->null();
        }

        $model->loadMissing('nodes');

        return $this->collection($model->getRelation('nodes'), $this->makeTransformer(NodeTransformer::class), Node::RESOURCE_NAME);
    }

    /**
     * Include the servers that currently have this mount attached.
     *
     * @throws \Pterodactyl\Exceptions\Transformer\InvalidTransformerLevelException
     */
    public function includeServers(Mount $model): Collection|NullResource
    {
        if (!$this->authorize(AdminAcl::RESOURCE_SERVERS)) {
            return $this->null();
        }

        $model->loadMissing('servers');

        return $this->collection($model->getRelation('servers'), $this->makeTransformer(ServerTransformer::class), Server::RESOURCE_NAME);
    }
}
