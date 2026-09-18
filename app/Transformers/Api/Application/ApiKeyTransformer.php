<?php

namespace Pterodactyl\Transformers\Api\Application;

use Pterodactyl\Models\ApiKey;
use Pterodactyl\Services\Acl\Api\AdminAcl;

class ApiKeyTransformer extends BaseTransformer
{
    /**
     * Return the resource name for the JSONAPI output.
     */
    public function getResourceName(): string
    {
        return ApiKey::RESOURCE_NAME;
    }

    /**
     * Transform an application API key into a representation for the application API.
     * The secret portion of the token is never included.
     *
     * @throws \ReflectionException
     */
    public function transform(ApiKey $model): array
    {
        return [
            'identifier' => $model->identifier,
            'description' => $model->memo,
            'user_id' => $model->user_id,
            'allowed_ips' => $model->allowed_ips ?? [],
            'permissions' => collect(AdminAcl::getResourceList())->mapWithKeys(function (string $resource) use ($model) {
                return [$resource => (int) $model->getAttribute(AdminAcl::COLUMN_IDENTIFIER . $resource)];
            })->all(),
            'last_used_at' => $model->last_used_at?->toAtomString(),
            'created_at' => $model->created_at->toAtomString(),
        ];
    }
}
