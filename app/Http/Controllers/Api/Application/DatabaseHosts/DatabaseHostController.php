<?php

namespace Pterodactyl\Http\Controllers\Api\Application\DatabaseHosts;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\DatabaseHost;
use Spatie\QueryBuilder\QueryBuilder;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Databases\Hosts\HostUpdateService;
use Pterodactyl\Services\Databases\Hosts\HostCreationService;
use Pterodactyl\Services\Databases\Hosts\HostDeletionService;
use Pterodactyl\Transformers\Api\Application\DatabaseHostTransformer;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\DatabaseHosts\GetDatabaseHostRequest;
use Pterodactyl\Http\Requests\Api\Application\DatabaseHosts\GetDatabaseHostsRequest;
use Pterodactyl\Http\Requests\Api\Application\DatabaseHosts\StoreDatabaseHostRequest;
use Pterodactyl\Http\Requests\Api\Application\DatabaseHosts\DeleteDatabaseHostRequest;
use Pterodactyl\Http\Requests\Api\Application\DatabaseHosts\UpdateDatabaseHostRequest;

class DatabaseHostController extends ApplicationApiController
{
    /**
     * DatabaseHostController constructor.
     */
    public function __construct(
        private HostCreationService $creationService,
        private HostDeletionService $deletionService,
        private HostUpdateService $updateService,
    ) {
        parent::__construct();
    }

    /**
     * Return all the database hosts currently registered on the Panel.
     */
    public function index(GetDatabaseHostsRequest $request): array
    {
        $hosts = QueryBuilder::for(DatabaseHost::query()->withCount('databases'))
            ->allowedFilters(['name', 'host'])
            ->allowedSorts(['id', 'name', 'host'])
            ->paginate($request->query('per_page') ?? 50);

        return $this->fractal->collection($hosts)
            ->transformWith($this->getTransformer(DatabaseHostTransformer::class))
            ->toArray();
    }

    /**
     * Return a single database host.
     */
    public function view(GetDatabaseHostRequest $request, DatabaseHost $host): array
    {
        return $this->fractal->item($host)
            ->transformWith($this->getTransformer(DatabaseHostTransformer::class))
            ->toArray();
    }

    /**
     * Store a new database host on the Panel. The credentials are verified against
     * the host before anything is persisted.
     *
     * @throws \Throwable
     */
    public function store(StoreDatabaseHostRequest $request): JsonResponse
    {
        $host = $this->guard(fn () => $this->creationService->handle($request->normalize()));

        return $this->fractal->item($host)
            ->transformWith($this->getTransformer(DatabaseHostTransformer::class))
            ->addMeta([
                'resource' => route('api.application.database-hosts.view', [
                    'host' => $host->id,
                ]),
            ])
            ->respond(201);
    }

    /**
     * Update a database host on the Panel and return the updated record.
     *
     * @throws \Throwable
     */
    public function update(UpdateDatabaseHostRequest $request, DatabaseHost $host): array
    {
        $host = $this->guard(fn () => $this->updateService->handle($host->id, $request->normalize()));

        return $this->fractal->item($host)
            ->transformWith($this->getTransformer(DatabaseHostTransformer::class))
            ->toArray();
    }

    /**
     * Delete a database host from the Panel.
     *
     * @throws \Pterodactyl\Exceptions\Service\HasActiveServersException
     */
    public function delete(DeleteDatabaseHostRequest $request, DatabaseHost $host): Response
    {
        $this->deletionService->handle($host->id);

        return $this->returnNoContent();
    }

    /**
     * Executes the callback and converts any connection or query error reported by
     * the remote database host into an error that is displayed to the caller.
     *
     * @throws \Throwable
     */
    private function guard(\Closure $callback): DatabaseHost
    {
        try {
            return $callback();
        } catch (\Exception $exception) {
            if ($exception instanceof \PDOException || $exception->getPrevious() instanceof \PDOException) {
                throw new DisplayException(sprintf('There was an error while trying to connect to the host or while executing a query: "%s"', $exception->getMessage()));
            }

            throw $exception;
        }
    }
}
