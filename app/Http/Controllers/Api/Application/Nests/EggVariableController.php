<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Nests;

use Illuminate\Support\Str;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Eggs\Variables\VariableUpdateService;
use Pterodactyl\Services\Eggs\Variables\VariableCreationService;
use Pterodactyl\Transformers\Api\Application\EggVariableTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\Variables\GetEggVariablesRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\Variables\StoreEggVariableRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\Variables\DeleteEggVariableRequest;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\Variables\UpdateEggVariableRequest;

class EggVariableController extends ApplicationApiController
{
    /**
     * EggVariableController constructor.
     */
    public function __construct(
        private VariableCreationService $creationService,
        private VariableUpdateService $updateService,
    ) {
        parent::__construct();
    }

    /**
     * Return all the variables that are defined for an egg.
     */
    public function index(GetEggVariablesRequest $request, Nest $nest, Egg $egg): array
    {
        return $this->fractal->collection($egg->variables)
            ->transformWith($this->getTransformer(EggVariableTransformer::class))
            ->toArray();
    }

    /**
     * Create a new variable for an egg.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Service\Egg\Variable\BadValidationRuleException
     * @throws \Pterodactyl\Exceptions\Service\Egg\Variable\ReservedVariableNameException
     */
    public function store(StoreEggVariableRequest $request, Nest $nest, Egg $egg): JsonResponse
    {
        $variable = $this->guard(fn () => $this->creationService->handle($egg->id, $request->normalize()));

        return $this->fractal->item($variable)
            ->transformWith($this->getTransformer(EggVariableTransformer::class))
            ->respond(201);
    }

    /**
     * Update an existing egg variable.
     *
     * @throws DisplayException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     * @throws \Pterodactyl\Exceptions\Service\Egg\Variable\ReservedVariableNameException
     */
    public function update(UpdateEggVariableRequest $request, Nest $nest, Egg $egg, EggVariable $variable): array
    {
        $this->guard(fn () => $this->updateService->handle($variable, $request->normalize()));

        return $this->fractal->item($variable->refresh())
            ->transformWith($this->getTransformer(EggVariableTransformer::class))
            ->toArray();
    }

    /**
     * Delete an egg variable from the Panel.
     */
    public function delete(DeleteEggVariableRequest $request, Nest $nest, Egg $egg, EggVariable $variable): Response
    {
        $variable->delete();

        return $this->returnNoContent();
    }

    /**
     * Executes the callback, reporting the use of a validation rule that does not exist
     * as an error that can be displayed to the caller rather than a server error.
     *
     * @throws DisplayException
     */
    private function guard(\Closure $callback): mixed
    {
        try {
            return $callback();
        } catch (\BadMethodCallException $exception) {
            if (preg_match('/validate(\w+) does not exist/', $exception->getMessage(), $matches)) {
                throw new DisplayException(trans('exceptions.nest.variables.bad_validation_rule', ['rule' => Str::snake($matches[1])]), $exception);
            }

            throw $exception;
        }
    }
}
