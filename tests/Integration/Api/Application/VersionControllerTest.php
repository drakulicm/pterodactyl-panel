<?php

namespace Pterodactyl\Tests\Integration\Api\Application;

use Mockery\MockInterface;
use Illuminate\Http\Response;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

class VersionControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that the panel and wings versions are returned alongside the support links.
     */
    public function testVersionIsReturned()
    {
        $this->mock(SoftwareVersionService::class, function (MockInterface $mock) {
            $mock->expects('getPanel')->andReturns('1.15.1');
            $mock->expects('isLatestPanel')->andReturns(true);
            $mock->expects('getDaemon')->andReturns('1.13.3');
            $mock->expects('getDiscord')->andReturns('https://pterodactyl.io/discord');
            $mock->expects('getDonations')->andReturns('https://github.com/sponsors/matthewpi');
        });

        $response = $this->getJson('/api/application/version');
        $response->assertOk();
        $response->assertJsonPath('panel.current', config('app.version'));
        $response->assertJsonPath('panel.latest', '1.15.1');
        $response->assertJsonPath('panel.is_latest', true);
        $response->assertJsonPath('wings.latest', '1.13.3');
        $response->assertJsonPath('links.discord', 'https://pterodactyl.io/discord');
        $response->assertJsonPath('links.donations', 'https://github.com/sponsors/matthewpi');
    }

    /**
     * Test that a failure to reach the CDN is reported rather than raising an error.
     */
    public function testVersionIsReturnedWhenTheCdnCannotBeReached()
    {
        $this->mock(SoftwareVersionService::class, function (MockInterface $mock) {
            $mock->expects('getPanel')->andReturns('error');
            $mock->expects('isLatestPanel')->andReturns(false);
            $mock->expects('getDaemon')->andReturns('error');
            $mock->expects('getDiscord')->andReturns('https://pterodactyl.io/discord');
            $mock->expects('getDonations')->andReturns('https://github.com/sponsors/matthewpi');
        });

        $this->getJson('/api/application/version')
            ->assertOk()
            ->assertJsonPath('panel.latest', 'error')
            ->assertJsonPath('panel.is_latest', false)
            ->assertJsonPath('wings.latest', 'error');
    }

    /**
     * Test that an application API key is never able to read the version endpoint.
     */
    public function testApiKeyCannotReadVersion()
    {
        $this->usingApiKey()->getJson('/api/application/version')->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /**
     * Test that a user who is not an administrator cannot read the version endpoint.
     */
    public function testNonAdminCannotReadVersion()
    {
        $this->getApiUser()->update(['root_admin' => false]);

        $this->getJson('/api/application/version')->assertStatus(Response::HTTP_FORBIDDEN);
    }
}
