<?php

namespace Pterodactyl\Http\Requests\Api\Application\Settings;

use Pterodactyl\Http\Requests\Api\Application\SessionOnlyApplicationApiRequest;

abstract class UpdateSettingsRequest extends SessionOnlyApplicationApiRequest
{
    /**
     * Settings are persisted as strings. JSON booleans are converted to the "true" and
     * "false" strings that are submitted by the administrative forms before validating.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(
            collect($this->all())->filter(fn ($value) => is_bool($value))
                ->map(fn (bool $value) => $value ? 'true' : 'false')
                ->all()
        );
    }

    /**
     * Return only the fields that we are interested in from the request.
     * This will include empty fields as a null value.
     */
    public function normalize(): array
    {
        return $this->only(array_keys($this->rules()));
    }
}
