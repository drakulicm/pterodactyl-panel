<?php

namespace Pterodactyl\Tests\Unit\Services\Eggs\Sharing;

use Pterodactyl\Tests\TestCase;
use Illuminate\Http\Client\Factory;
use Pterodactyl\Services\Eggs\Sharing\EggRemoteFetcherService;

class EggRemoteFetcherServiceTest extends TestCase
{
    /**
     * Test that links to a file on GitHub or a Gist are rewritten to the raw file.
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('urlDataProvider')]
    public function testUrlsAreNormalized(string $input, string $expected)
    {
        $service = new EggRemoteFetcherService(new Factory());

        $this->assertSame($expected, $service->normalize($input));
    }

    public static function urlDataProvider(): array
    {
        return [
            'github blob page' => [
                'https://github.com/pelican-eggs/minecraft/blob/main/java/paper/egg-paper.json',
                'https://raw.githubusercontent.com/pelican-eggs/minecraft/main/java/paper/egg-paper.json',
            ],
            'github blob page with query string' => [
                'https://github.com/pelican-eggs/minecraft/blob/main/java/paper/egg-paper.json?plain=1',
                'https://raw.githubusercontent.com/pelican-eggs/minecraft/main/java/paper/egg-paper.json',
            ],
            'github raw redirect link' => [
                'https://github.com/pelican-eggs/minecraft/raw/main/java/paper/egg-paper.json',
                'https://raw.githubusercontent.com/pelican-eggs/minecraft/main/java/paper/egg-paper.json',
            ],
            'github with www and surrounding whitespace' => [
                '  https://www.github.com/owner/repo/blob/v1.2.3/eggs/egg.json ',
                'https://raw.githubusercontent.com/owner/repo/v1.2.3/eggs/egg.json',
            ],
            'gist page' => [
                'https://gist.github.com/someone/0123456789abcdef0123456789abcdef',
                'https://gist.githubusercontent.com/someone/0123456789abcdef0123456789abcdef/raw',
            ],
            'raw github url is untouched' => [
                'https://raw.githubusercontent.com/owner/repo/main/egg.json',
                'https://raw.githubusercontent.com/owner/repo/main/egg.json',
            ],
            'other hosts are untouched' => [
                'https://example.com/eggs/egg.json?download=1',
                'https://example.com/eggs/egg.json?download=1',
            ],
        ];
    }
}
