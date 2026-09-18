<?php

namespace Pterodactyl\Http\Controllers\Api\Application;

use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Http\Requests\Api\Application\GetVersionRequest;

class VersionController extends ApplicationApiController
{
    /**
     * VersionController constructor.
     */
    public function __construct(private SoftwareVersionService $versionService)
    {
        parent::__construct();
    }

    /**
     * Returns the version of the Panel that is currently running, as well as the latest
     * available versions of the Panel and Wings as reported by the CDN.
     */
    public function __invoke(GetVersionRequest $request): JsonResponse
    {
        return new JsonResponse([
            'panel' => [
                'current' => config('app.version'),
                'latest' => $this->versionService->getPanel(),
                'is_latest' => $this->versionService->isLatestPanel(),
            ],
            'wings' => [
                'latest' => $this->versionService->getDaemon(),
            ],
            'links' => [
                'discord' => $this->versionService->getDiscord(),
                'donations' => $this->versionService->getDonations(),
            ],
        ]);
    }
}
