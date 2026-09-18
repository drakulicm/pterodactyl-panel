<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Nests;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Eggs\EggUpdateService;
use Pterodactyl\Services\Eggs\EggCreationService;
use Pterodactyl\Services\Eggs\EggDeletionService;
use Pterodactyl\Services\Eggs\Sharing\EggExporterService;
use Pterodactyl\Services\Eggs\Scripts\InstallScriptService;
use Pterodactyl\Transformers\Api\Application\EggTransformer;
use Pterodactyl\Services\Eggs\Sharing\EggUpdateImporterService;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\StoreEggRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\DeleteEggRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\ExportEggRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\ImportEggRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\UpdateEggRequest;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\UpdateEggScriptRequest;

class EggManagementController extends ApplicationApiController
{
    /**
     * EggManagementController constructor.
     */
    public function __construct(
        private EggCreationService $creationService,
        private EggDeletionService $deletionService,
        private EggUpdateService $updateService,
        private EggExporterService $exporterService,
        private EggUpdateImporterService $updateImporterService,
        private InstallScriptService $installScriptService,
    ) {
        parent::__construct();
    }

    /**
     * Store a new egg in the given nest.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Service\Egg\NoParentConfigurationFoundException
     */
    public function store(StoreEggRequest $request, Nest $nest): JsonResponse
    {
        $egg = $this->creationService->handle(array_merge($request->validated(), ['nest_id' => $nest->id]));

        return $this->fractal->item($egg)
            ->transformWith($this->getTransformer(EggTransformer::class))
            ->addMeta([
                'resource' => route('api.application.nests.eggs.view', [
                    'nest' => $nest->id,
                    'egg' => $egg->id,
                ]),
            ])
            ->respond(201);
    }

    /**
     * Update an egg and return the updated record.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     * @throws \Pterodactyl\Exceptions\Service\Egg\NoParentConfigurationFoundException
     */
    public function update(UpdateEggRequest $request, Nest $nest, Egg $egg): array
    {
        $this->updateService->handle($egg, $request->validated());

        return $this->transform($egg);
    }

    /**
     * Delete an egg from the Panel.
     *
     * @throws \Pterodactyl\Exceptions\Service\Egg\HasChildrenException
     * @throws \Pterodactyl\Exceptions\Service\HasActiveServersException
     */
    public function delete(DeleteEggRequest $request, Nest $nest, Egg $egg): Response
    {
        $this->deletionService->handle($egg->id);

        return $this->returnNoContent();
    }

    /**
     * Export an egg as a JSON file that can be imported on any other Panel.
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function export(ExportEggRequest $request, Nest $nest, Egg $egg): Response
    {
        $filename = trim(preg_replace('/\W/', '-', kebab_case($egg->name)), '-');

        return new Response($this->exporterService->handle($egg->id), Response::HTTP_OK, [
            'Content-Transfer-Encoding' => 'binary',
            'Content-Description' => 'File Transfer',
            'Content-Disposition' => 'attachment; filename=egg-' . $filename . '.json',
            'Content-Type' => 'application/json',
        ]);
    }

    /**
     * Update an existing egg using an exported egg JSON file.
     *
     * @throws \Throwable
     */
    public function import(ImportEggRequest $request, Nest $nest, Egg $egg): array
    {
        $this->updateImporterService->handle($egg, $request->getImportFile());

        return $this->transform($egg);
    }

    /**
     * Update the install script of an egg.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     * @throws \Pterodactyl\Exceptions\Service\Egg\InvalidCopyFromException
     */
    public function script(UpdateEggScriptRequest $request, Nest $nest, Egg $egg): array
    {
        $this->installScriptService->handle($egg, $request->normalize());

        return $this->transform($egg);
    }

    /**
     * Returns the transformed representation of a freshly loaded egg.
     */
    private function transform(Egg $egg): array
    {
        return $this->fractal->item($egg->refresh())
            ->transformWith($this->getTransformer(EggTransformer::class))
            ->toArray();
    }
}
