<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs;

use Illuminate\Http\UploadedFile;
use Pterodactyl\Services\Eggs\Sharing\EggRemoteFetcherService;

class ImportEggRequest extends EggWriteRequest
{
    /**
     * Rules to validate the request against. An egg can be provided as an uploaded
     * file ("import_file"), as a URL to download it from ("import_url"), or directly
     * as the JSON body of the request.
     */
    public function rules(): array
    {
        return [
            'import_file' => 'bail|required_without_all:import_url,meta|file|max:1000|mimetypes:application/json,text/plain',
            'import_url' => 'bail|required_without_all:import_file,meta|string|max:2048|url:http,https',
            'meta' => 'required_without_all:import_file,import_url|array',
            'meta.version' => 'required_with:meta|string',
        ];
    }

    /**
     * Returns the egg that should be imported as a file instance, which is what the
     * egg importer services expect to receive.
     *
     * @throws \Pterodactyl\Exceptions\Service\InvalidFileUploadException
     */
    public function getImportFile(): UploadedFile
    {
        if ($this->hasFile('import_file')) {
            return $this->file('import_file');
        }

        if ($this->filled('import_url')) {
            return $this->container->make(EggRemoteFetcherService::class)->handle($this->input('import_url'));
        }

        $path = tempnam(sys_get_temp_dir(), 'egg_import_');
        // The raw body is used as the parsed input has been modified by the global request
        // middleware at this point (empty strings converted to null, values trimmed).
        file_put_contents($path, $this->getContent());
        register_shutdown_function(fn () => @unlink($path));

        return new UploadedFile($path, 'egg.json', 'application/json', UPLOAD_ERR_OK, true);
    }
}
