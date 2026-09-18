<?php

namespace Pterodactyl\Http\Requests\Api\Application\ApiKeys;

use Pterodactyl\Models\ApiKey;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

class StoreApiKeyRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Rules to validate the request against, a permission level can be
     * provided for each of the resources known to the ACL ("r_<resource>").
     *
     * @throws \ReflectionException
     */
    public function rules(): array
    {
        $modelRules = ApiKey::getRules();

        return collect(AdminAcl::getResourceList())->mapWithKeys(function ($resource) use ($modelRules) {
            return [AdminAcl::COLUMN_IDENTIFIER . $resource => $modelRules['r_' . $resource]];
        })->merge(['memo' => $modelRules['memo']])->toArray();
    }

    public function attributes(): array
    {
        return [
            'memo' => 'Description',
        ];
    }

    /**
     * Returns the permission levels that were provided in the request.
     */
    public function getKeyPermissions(): array
    {
        return collect($this->validated())->filter(function ($value, $key) {
            return str_starts_with($key, AdminAcl::COLUMN_IDENTIFIER);
        })->toArray();
    }
}
