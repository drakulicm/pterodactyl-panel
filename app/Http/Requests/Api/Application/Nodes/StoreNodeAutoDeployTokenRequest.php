<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nodes;

use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

/**
 * Generating a deployment token creates (or reveals) an application API key owned by
 * the administrator making the request, so this is restricted to session authentication.
 */
class StoreNodeAutoDeployTokenRequest extends SessionOnlyApplicationApiRequest
{
}
