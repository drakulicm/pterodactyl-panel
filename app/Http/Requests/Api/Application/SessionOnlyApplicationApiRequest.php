<?php

namespace Pterodactyl\Http\Requests\Api\Application;

use Laravel\Sanctum\TransientToken;

/**
 * Base request for administrative endpoints whose resource has no matching column
 * in the Application API key ACL (settings, mounts, API keys, etc.). These endpoints
 * can only be reached by a root administrator authenticated using their session
 * cookie, requests made using an API key are always rejected.
 */
abstract class SessionOnlyApplicationApiRequest extends ApplicationApiRequest
{
    protected ?string $resource = null;

    /**
     * Determine if the current request was made by a root administrator that is
     * authenticated using a session cookie rather than an API key.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (is_null($user) || !$user->root_admin) {
            return false;
        }

        return $user->currentAccessToken() instanceof TransientToken;
    }
}
