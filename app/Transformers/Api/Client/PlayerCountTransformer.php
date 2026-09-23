<?php

namespace Pterodactyl\Transformers\Api\Client;

use Illuminate\Support\Arr;

class PlayerCountTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return 'player_count';
    }

    /**
     * Transform the result of a game server query into a client API response.
     */
    public function transform(array $data): array
    {
        return [
            'is_online' => Arr::get($data, 'online', false),
            'players' => Arr::get($data, 'players', 0),
            'max_players' => Arr::get($data, 'max_players', 0),
        ];
    }
}
