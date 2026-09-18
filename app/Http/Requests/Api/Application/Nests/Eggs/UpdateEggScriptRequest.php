<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs;

class UpdateEggScriptRequest extends EggWriteRequest
{
    /**
     * Rules to validate the request against.
     */
    public function rules(): array
    {
        return [
            'script_install' => 'sometimes|nullable|string',
            'script_is_privileged' => 'sometimes|required|boolean',
            'script_entry' => 'sometimes|required|string',
            'script_container' => 'sometimes|required|string',
            'copy_script_from' => 'sometimes|nullable|numeric',
        ];
    }

    /**
     * Return only the fields that the install script service expects to receive.
     */
    public function normalize(): array
    {
        return $this->only(array_keys($this->rules()));
    }
}
