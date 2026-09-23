<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Services\Servers\PlayerCountService;
use Pterodactyl\Transformers\Api\Client\PlayerCountTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Pterodactyl\Http\Requests\Api\Client\Servers\GetServerRequest;

class PlayerCountController extends ClientApiController
{
    public function __construct(private PlayerCountService $service)
    {
        parent::__construct();
    }

    /**
     * Return the number of players connected to a server. Only games the panel
     * knows how to query expose this, everything else is a 404.
     */
    public function __invoke(GetServerRequest $request, Server $server): array
    {
        if (!$this->service->isSupported($server)) {
            throw new NotFoundHttpException('This server does not report a player count.');
        }

        return $this->fractal->item($this->service->handle($server))
            ->transformWith($this->getTransformer(PlayerCountTransformer::class))
            ->toArray();
    }
}
