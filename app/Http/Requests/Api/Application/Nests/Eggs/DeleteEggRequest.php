<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs;

use Pterodactyl\Services\Acl\Api\AdminAcl;

class DeleteEggRequest extends EggWriteRequest
{
    protected int $permission = AdminAcl::WRITE;
}
