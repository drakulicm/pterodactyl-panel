<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Transformers\Api\Application\ServerTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Servers\ToggleInstallServerRequest;

class ServerInstallController extends ApplicationApiController
{
    /**
     * Toggles the install status of a server between installed and installing.
     *
     * @throws DisplayException
     */
    public function __invoke(ToggleInstallServerRequest $request, Server $server): array
    {
        if ($server->status === Server::STATUS_INSTALL_FAILED) {
            throw new DisplayException(trans('admin/server.exceptions.marked_as_failed'));
        }

        $server->forceFill([
            'status' => $server->isInstalled() ? Server::STATUS_INSTALLING : null,
        ])->save();

        return $this->fractal->item($server)
            ->transformWith($this->getTransformer(ServerTransformer::class))
            ->toArray();
    }
}
