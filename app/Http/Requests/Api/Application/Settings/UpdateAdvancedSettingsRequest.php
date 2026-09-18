<?php

namespace Pterodactyl\Http\Requests\Api\Application\Settings;

use Pterodactyl\Http\Requests\Admin\Settings\AdvancedSettingsFormRequest;

class UpdateAdvancedSettingsRequest extends UpdateSettingsRequest
{
    /**
     * Rules to validate the request against, shared with the administrative form. The
     * reCAPTCHA secret key is never exposed by the API, so unlike the form it is optional
     * and the stored value is kept when it is not provided.
     */
    public function rules(): array
    {
        return array_merge((new AdvancedSettingsFormRequest())->rules(), [
            'recaptcha:secret_key' => 'nullable|string|max:191',
        ]);
    }

    public function attributes(): array
    {
        return (new AdvancedSettingsFormRequest())->attributes();
    }

    /**
     * Return the fields to persist, leaving the secret key untouched when it is empty.
     */
    public function normalize(): array
    {
        $keys = array_keys($this->rules());

        if (empty($this->input('recaptcha:secret_key'))) {
            $keys = array_values(array_diff($keys, ['recaptcha:secret_key']));
        }

        return $this->only($keys);
    }
}
