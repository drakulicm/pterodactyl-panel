<?php

namespace Pterodactyl\Tests\Integration\Api\Application\ApiKeys;

use Illuminate\Http\Response;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Tests\Integration\Api\Application\SessionApplicationApiIntegrationTestCase;

class ApiKeyControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that the resources that can be assigned to a key are returned.
     */
    public function testGetResources()
    {
        $response = $this->getJson('/api/application/api-keys/resources')->assertOk();

        $response->assertJsonPath('permissions', ['none' => 0, 'read' => 1, 'read_write' => 3]);
        $this->assertContains('servers', $response->json('resources'));
    }

    /**
     * Test that a key can be created, that the token is returned once, and that it works.
     */
    public function testCreateApiKey()
    {
        $response = $this->postJson('/api/application/api-keys', [
            'memo' => 'Test Key',
            'r_nodes' => 1,
            'r_servers' => 3,
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('object', 'api_key');
        $response->assertJsonPath('attributes.description', 'Test Key');
        $response->assertJsonPath('attributes.permissions.nodes', 1);
        $response->assertJsonPath('attributes.permissions.servers', 3);
        $response->assertJsonPath('attributes.permissions.users', 0);

        /** @var ApiKey $key */
        $key = ApiKey::query()->where('identifier', $response->json('attributes.identifier'))->firstOrFail();
        $this->assertSame(ApiKey::TYPE_APPLICATION, $key->key_type);
        $this->assertSame($key->identifier . decrypt($key->token), $response->json('meta.secret_token'));

        $list = $this->getJson('/api/application/api-keys')->assertOk();
        $this->assertStringNotContainsString(decrypt($key->token), $list->getContent());
    }

    /**
     * Test that a description is required and that permission levels are validated.
     */
    public function testCreateApiKeyValidation()
    {
        $this->postJson('/api/application/api-keys', ['r_nodes' => 5])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that a key can be deleted using its identifier.
     */
    public function testDeleteApiKey()
    {
        $key = $this->getApiKey();

        $this->deleteJson('/api/application/api-keys/' . $key->identifier)->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('api_keys', ['id' => $key->id]);

        $this->assertNotFoundJson($this->deleteJson('/api/application/api-keys/' . $key->identifier));
    }

    /**
     * Test that API keys cannot be managed using an API key.
     */
    public function testApiKeyCannotManageApiKeys()
    {
        $this->usingApiKey();

        $this->assertAccessDeniedJson($this->getJson('/api/application/api-keys'));
        $this->assertAccessDeniedJson($this->postJson('/api/application/api-keys', ['memo' => 'Nope']));
    }
}
