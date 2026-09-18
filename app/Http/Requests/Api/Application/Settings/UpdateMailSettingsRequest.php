<?php

namespace Pterodactyl\Http\Requests\Api\Application\Settings;

use Pterodactyl\Http\Requests\Admin\Settings\MailSettingsFormRequest;

class UpdateMailSettingsRequest extends UpdateSettingsRequest
{
    /**
     * Rules to validate the request against, shared with the administrative form.
     */
    public function rules(): array
    {
        return (new MailSettingsFormRequest())->rules();
    }

    /**
     * Override the default normalization function for this type of request as the
     * password is only updated when a value is provided for it.
     */
    public function normalize(): array
    {
        $keys = array_keys($this->rules());

        if (empty($this->input('mail:mailers:smtp:password'))) {
            $keys = array_values(array_diff($keys, ['mail:mailers:smtp:password']));
        }

        return $this->only($keys);
    }
}
