<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\Variables;

use Pterodactyl\Models\EggVariable;
use Pterodactyl\Http\Requests\Api\Application\Nests\Eggs\EggWriteRequest;

class StoreEggVariableRequest extends EggWriteRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|min:1|max:191',
            'description' => 'sometimes|nullable|string',
            'env_variable' => 'required|regex:/^[\w]{1,191}$/|notIn:' . EggVariable::RESERVED_ENV_NAMES,
            'user_viewable' => 'sometimes|boolean',
            'user_editable' => 'sometimes|boolean',
            'rules' => 'bail|required|string',
            'default_value' => 'present|nullable|string',
        ];
    }

    /**
     * Return the data in the format that the egg variable services expect, which is
     * the same as the one submitted by the administrative form ("options" array).
     */
    public function normalize(): array
    {
        $data = $this->only(['name', 'description', 'env_variable', 'rules', 'default_value']);

        $data['options'] = array_values(array_filter([
            $this->boolean('user_viewable') ? 'user_viewable' : null,
            $this->boolean('user_editable') ? 'user_editable' : null,
        ]));

        return $data;
    }
}
