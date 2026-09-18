<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs;

use Illuminate\Validation\Validator;

class StoreEggRequest extends EggWriteRequest
{
    /**
     * Rules to validate the request against. These match the rules used by the
     * administrative egg form, except that "docker_images" is a name => image map and
     * the "config_*" values can be sent as JSON objects rather than encoded strings.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:191',
            'description' => 'nullable|string',
            'docker_images' => 'required|array|min:1',
            'docker_images.*' => ['required', 'string', 'max:191', 'regex:/^[\w#\.\/\- ]*\|?~?[\w\.\/\-:@ ]*$/'],
            'force_outgoing_ip' => 'sometimes|boolean',
            'file_denylist' => 'array',
            'file_denylist.*' => 'string',
            'features' => 'sometimes|array',
            'features.*' => 'string',
            'startup' => 'required|string',
            'config_from' => 'sometimes|bail|nullable|numeric',
            'config_stop' => 'required_without:config_from|nullable|string|max:191',
            'config_startup' => 'required_without:config_from|nullable|json',
            'config_logs' => 'required_without:config_from|nullable|json',
            'config_files' => 'required_without:config_from|nullable|json',
        ];
    }

    /**
     * Only check that the parent egg exists when one was actually provided.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->sometimes('config_from', 'exists:eggs,id', function () {
            return (int) $this->input('config_from') !== 0;
        });
    }

    /**
     * Normalize the more convenient JSON representations accepted by the API into
     * the format expected by the egg services.
     */
    protected function prepareForValidation(): void
    {
        $data = [];
        foreach (['config_startup', 'config_logs', 'config_files'] as $key) {
            if (is_array($this->input($key))) {
                $value = $this->input($key);
                $data[$key] = json_encode(empty($value) ? new \stdClass() : $value, JSON_UNESCAPED_SLASHES);
            }
        }

        // A list of images (["image:tag"]) is converted into a name => image map.
        $images = $this->input('docker_images');
        if (is_array($images) && array_is_list($images)) {
            $data['docker_images'] = collect($images)->filter(fn ($v) => is_string($v))
                ->mapWithKeys(fn ($v) => [$v => $v])->all();
        }

        if ((int) $this->input('config_from') === 0 && $this->has('config_from')) {
            $data['config_from'] = null;
        }

        $this->merge($data);
    }

    /**
     * Return the validated data with defaults applied for the optional fields.
     */
    public function validated($key = null, $default = null): array
    {
        $data = parent::validated();

        return array_merge($data, [
            'force_outgoing_ip' => array_get($data, 'force_outgoing_ip', false),
            'features' => array_get($data, 'features', []),
        ]);
    }
}
