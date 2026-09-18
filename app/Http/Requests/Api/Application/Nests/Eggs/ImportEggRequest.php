<?php

namespace Pterodactyl\Http\Requests\Api\Application\Nests\Eggs;

use Illuminate\Http\UploadedFile;

class ImportEggRequest extends EggWriteRequest
{
    /**
     * Rules to validate the request against. An egg can be provided either as an
     * uploaded file ("import_file") or directly as the JSON body of the request.
     */
    public function rules(): array
    {
        return [
            'import_file' => 'bail|required_without:meta|file|max:1000|mimetypes:application/json,text/plain',
            'meta' => 'required_without:import_file|array',
            'meta.version' => 'required_with:meta|string',
        ];
    }

    /**
     * Returns the egg that should be imported as a file instance, which is what the
     * egg importer services expect to receive.
     */
    public function getImportFile(): UploadedFile
    {
        if ($this->hasFile('import_file')) {
            return $this->file('import_file');
        }

        $path = tempnam(sys_get_temp_dir(), 'egg_import_');
        // The raw body is used as the parsed input has been modified by the global request
        // middleware at this point (empty strings converted to null, values trimmed).
        file_put_contents($path, $this->getContent());
        register_shutdown_function(fn () => @unlink($path));

        return new UploadedFile($path, 'egg.json', 'application/json', UPLOAD_ERR_OK, true);
    }
}
