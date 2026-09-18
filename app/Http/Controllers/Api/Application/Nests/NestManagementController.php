<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Nests;

use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Nests\NestUpdateService;
use Pterodactyl\Services\Nests\NestCreationService;
use Pterodactyl\Services\Nests\NestDeletionService;
use Pterodactyl\Services\Eggs\Sharing\EggImporterService;
use Pterodactyl\Transformers\Api\Application\EggTransformer;
use Pterodactyl\Transformers\Api\Application\NestTransformer;
use Pterodactyl\Http\Requests\Api\Application\Nests\StoreNestRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\DeleteNestRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\UpdateNestRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\ImportEggRequest;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;

class NestManagementController extends ApplicationApiController
{
    /**
     * NestManagementController constructor.
     */
    public function __construct(
        private NestCreationService $creationService,
        private NestDeletionService $deletionService,
        private NestUpdateService $updateService,
        private EggImporterService $importerService,
    ) {
        parent::__construct();
    }

    /**
     * Store a new nest on the Panel.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function store(StoreNestRequest $request): JsonResponse
    {
        $nest = $this->creationService->handle($request->normalize());

        return $this->fractal->item($nest)
            ->transformWith($this->getTransformer(NestTransformer::class))
            ->addMeta([
                'resource' => route('api.application.nests.view', [
                    'nest' => $nest->id,
                ]),
            ])
            ->respond(201);
    }

    /**
     * Update a nest on the Panel and return the updated record.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(UpdateNestRequest $request, Nest $nest): array
    {
        $this->updateService->handle($nest->id, $request->normalize());

        return $this->fractal->item($nest->refresh())
            ->transformWith($this->getTransformer(NestTransformer::class))
            ->toArray();
    }

    /**
     * Delete a nest from the Panel.
     *
     * @throws \Pterodactyl\Exceptions\Service\HasActiveServersException
     */
    public function delete(DeleteNestRequest $request, Nest $nest): Response
    {
        $this->deletionService->handle($nest->id);

        return $this->returnNoContent();
    }

    /**
     * Import a new egg into the nest using an exported egg JSON file.
     *
     * @throws \Throwable
     */
    public function import(ImportEggRequest $request, Nest $nest): JsonResponse
    {
        $egg = $this->importerService->handle($request->getImportFile(), $nest->id);

        return $this->fractal->item($egg->refresh())
            ->transformWith($this->getTransformer(EggTransformer::class))
            ->addMeta([
                'resource' => route('api.application.nests.eggs.view', [
                    'nest' => $nest->id,
                    'egg' => $egg->id,
                ]),
            ])
            ->respond(201);
    }
}
