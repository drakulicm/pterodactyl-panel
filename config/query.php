<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Game Server Queries
    |--------------------------------------------------------------------------
    |
    | Wings only reports container resource usage, so a player count has to be
    | read from the game server itself over its own query protocol. The panel
    | opens the socket, which means it needs network access to the query port
    | on the node.
    */

    // How long to wait on a single query before treating the server as unreachable.
    'timeout' => (float) env('APP_QUERY_TIMEOUT', 2),

    // How long a result is cached for. Failures are cached too, so an unreachable
    // server is not queried again on every request.
    'ttl' => (int) env('APP_QUERY_TTL', 15),

    /*
    | Egg features that enable a player count, mapped to the offset added to the
    | server's primary allocation port to reach its query port. Valheim answers
    | on the port above its game port.
    |
    | Mirrored in resources/app/src/lib/playerCount.ts, which decides whether the
    | frontend asks for a player count at all.
    */
    'features' => [
        'valheim_query' => ['offset' => 1],
    ],
];
