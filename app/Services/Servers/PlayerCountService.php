<?php

namespace Pterodactyl\Services\Servers;

use Carbon\Carbon;
use Pterodactyl\Models\Server;
use Illuminate\Cache\Repository;

class PlayerCountService
{
    private const UNREACHABLE = ['online' => false, 'players' => 0, 'max_players' => 0];

    public function __construct(private Repository $cache, private A2SQueryService $query)
    {
    }

    /**
     * Determine whether this server's game is one the panel knows how to query.
     */
    public function isSupported(Server $server): bool
    {
        return $this->feature($server) !== null;
    }

    /**
     * Return the current player count for a server, cached so that a busy
     * dashboard does not turn into a flood of datagrams at the node.
     */
    public function handle(Server $server): array
    {
        $key = "players:$server->uuid";

        return $this->cache->remember($key, Carbon::now()->addSeconds((int) config('query.ttl')), function () use ($server) {
            return $this->fetch($server);
        });
    }

    private function fetch(Server $server): array
    {
        $feature = $this->feature($server);
        $allocation = $server->allocation;

        if ($feature === null || $allocation === null) {
            return self::UNREACHABLE;
        }

        $result = $this->query->query(
            $allocation->ip,
            $allocation->port + $feature['offset'],
            (float) config('query.timeout'),
        );

        if ($result === null) {
            return self::UNREACHABLE;
        }

        return [
            'online' => true,
            'players' => $result['players'],
            'max_players' => $result['max_players'],
        ];
    }

    /**
     * Resolve the query configuration for the first supported feature on this
     * server's egg, if it carries one at all.
     */
    private function feature(Server $server): ?array
    {
        $configured = config('query.features', []);

        foreach ($server->egg->inherit_features ?? [] as $feature) {
            if (isset($configured[$feature])) {
                return $configured[$feature];
            }
        }

        return null;
    }
}
