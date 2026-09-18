<?php

namespace Pterodactyl\Http\Requests\Api\Application\Settings;

use Pterodactyl\Http\Requests\Admin\Settings\BaseSettingsFormRequest;

class UpdateGeneralSettingsRequest extends UpdateSettingsRequest
{
    /**
     * Rules to validate the request against, shared with the administrative form.
     */
    public function rules(): array
    {
        return (new BaseSettingsFormRequest())->rules();
    }

    public function attributes(): array
    {
        return (new BaseSettingsFormRequest())->attributes();
    }
}
