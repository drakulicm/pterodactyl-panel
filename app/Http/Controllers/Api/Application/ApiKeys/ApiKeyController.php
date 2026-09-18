<?php

namespace Pterodactyl\Http\Controllers\Api\Application\ApiKeys;

use Illuminate\Http\Response;
use Pterodactyl\Models\ApiKey;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Services\Api\KeyCreationService;
use Pterodactyl\Transformers\Api\Application\ApiKeyTransformer;
use Pterodactyl\Http\Requests\Api\Application\ApiKeys\GetApiKeysRequest;
use Pterodactyl\Http\Requests\Api\Application\ApiKeys\StoreApiKeyRequest;
use Pterodactyl\Http\Requests\Api\Application\ApiKeys\DeleteApiKeyRequest;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;

class ApiKeyController extends ApplicationApiController
{
    /**
     * ApiKeyController constructor.
     */
    public function __construct(
        private Encrypter $encrypter,
        private KeyCreationService $keyCreationService,
    ) {
        parent::__construct();
    }

    /**
     * Returns all the application API keys that exist on the Panel.
     */
    public function index(GetApiKeysRequest $request): array
    {
        $keys = ApiKey::query()->where('key_type', ApiKey::TYPE_APPLICATION)->orderBy('id')->get();

        return $this->fractal->collection($keys)
            ->transformWith($this->getTransformer(ApiKeyTransformer::class))
            ->toArray();
    }

    /**
     * Returns the resources that a permission level can be assigned for, as
     * well as the available permission levels.
     *
     * @throws \ReflectionException
     */
    public function resources(GetApiKeysRequest $request): JsonResponse
    {
        $resources = AdminAcl::getResourceList();
        sort($resources);

        return new JsonResponse([
            'resources' => $resources,
            'permissions' => [
                'none' => AdminAcl::NONE,
                'read' => AdminAcl::READ,
                'read_write' => AdminAcl::READ | AdminAcl::WRITE,
            ],
        ]);
    }

    /**
     * Store a new application API key. The full token is only ever returned
     * in the metadata of this response.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function store(StoreApiKeyRequest $request): JsonResponse
    {
        $key = $this->keyCreationService->setKeyType(ApiKey::TYPE_APPLICATION)->handle([
            'memo' => $request->input('memo'),
            'user_id' => $request->user()->id,
        ], $request->getKeyPermissions());

        return $this->fractal->item($key)
            ->transformWith($this->getTransformer(ApiKeyTransformer::class))
            ->addMeta(['secret_token' => $key->identifier . $this->encrypter->decrypt($key->token)])
            ->respond(201);
    }

    /**
     * Delete an application API key from the Panel.
     */
    public function delete(DeleteApiKeyRequest $request, string $identifier): Response
    {
        ApiKey::query()
            ->where('key_type', ApiKey::TYPE_APPLICATION)
            ->where('identifier', $identifier)
            ->firstOrFail()
            ->delete();

        return $this->returnNoContent();
    }
}
