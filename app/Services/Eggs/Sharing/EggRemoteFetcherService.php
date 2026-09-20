<?php

namespace Pterodactyl\Services\Eggs\Sharing;

use Illuminate\Http\UploadedFile;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\ConnectionException;
use Pterodactyl\Exceptions\Service\InvalidFileUploadException;

class EggRemoteFetcherService
{
    /**
     * The largest egg document that will be downloaded, matching the limit that
     * applies to an uploaded file.
     */
    public const MAX_BYTES = 1000 * 1024;

    public function __construct(protected Factory $http)
    {
    }

    /**
     * Download an egg document from a URL and return it as an uploaded file so that
     * it can be handed to the same importer the file upload path uses.
     *
     * @throws InvalidFileUploadException
     */
    public function handle(string $url): UploadedFile
    {
        $url = $this->normalize($url);

        try {
            $response = $this->http
                ->timeout((int) config('pterodactyl.guzzle.timeout'))
                ->connectTimeout((int) config('pterodactyl.guzzle.connect_timeout'))
                ->withHeaders(['Accept' => 'application/json, text/plain;q=0.9, */*;q=0.1'])
                ->get($url);
        } catch (ConnectionException $exception) {
            throw new InvalidFileUploadException(sprintf('Could not download the egg from %s: %s', $url, $exception->getMessage()));
        }

        if (!$response->successful()) {
            throw new InvalidFileUploadException(sprintf('Could not download the egg from %s: the server responded with HTTP %d.', $url, $response->status()));
        }

        $body = $response->body();
        if (strlen($body) > self::MAX_BYTES) {
            throw new InvalidFileUploadException('The egg file at that URL is larger than 1000 KB and cannot be imported.');
        }

        if (!is_array(json_decode($body, true))) {
            throw new InvalidFileUploadException(sprintf('The URL %s did not return a JSON document. Paste a link to the egg file itself, for example the "Raw" link on GitHub.', $url));
        }

        $path = tempnam(sys_get_temp_dir(), 'egg_import_');
        file_put_contents($path, $body);
        register_shutdown_function(fn () => @unlink($path));

        return new UploadedFile($path, $this->filename($url), 'application/json', UPLOAD_ERR_OK, true);
    }

    /**
     * Rewrite links to a file's page on GitHub or a Gist into the raw file behind it,
     * so that pasting the browser's address bar works. Other URLs are returned as-is.
     */
    public function normalize(string $url): string
    {
        $url = trim($url);

        if (preg_match('#^https?://(?:www\.)?github\.com/([^/]+)/([^/]+)/(?:blob|raw)/([^?\#]+)#i', $url, $matches)) {
            return sprintf('https://raw.githubusercontent.com/%s/%s/%s', $matches[1], $matches[2], $matches[3]);
        }

        if (preg_match('#^https?://gist\.github\.com/([^/]+)/([a-f0-9]+)/?(?:[?\#].*)?$#i', $url, $matches)) {
            return sprintf('https://gist.githubusercontent.com/%s/%s/raw', $matches[1], $matches[2]);
        }

        return $url;
    }

    protected function filename(string $url): string
    {
        $name = basename((string) parse_url($url, PHP_URL_PATH));

        return str_ends_with(strtolower($name), '.json') ? $name : 'egg.json';
    }
}
