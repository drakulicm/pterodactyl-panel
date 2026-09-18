<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Nodes;

use Illuminate\Support\Str;
use Pterodactyl\Models\Node;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Nodes\GetNodeSystemInformationRequest;

class NodeSystemInformationController extends ApplicationApiController
{
    /**
     * NodeSystemInformationController constructor.
     */
    public function __construct(private DaemonConfigurationRepository $repository)
    {
        parent::__construct();
    }

    /**
     * Returns system information reported by the Wings instance running on the node.
     *
     * @throws \Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException
     */
    public function __invoke(GetNodeSystemInformationRequest $request, Node $node): JsonResponse
    {
        $data = $this->repository->setNode($node)->getSystemInformation();

        return new JsonResponse([
            'version' => $data['version'] ?? '',
            'system' => [
                'type' => Str::title($data['os'] ?? 'Unknown'),
                'arch' => $data['architecture'] ?? '--',
                'release' => $data['kernel_version'] ?? '--',
                'cpus' => (int) ($data['cpu_count'] ?? 0),
            ],
        ]);
    }
}
