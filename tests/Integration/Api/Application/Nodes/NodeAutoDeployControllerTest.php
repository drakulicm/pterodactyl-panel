<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nodes;

use Illuminate\Http\Response;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Tests\Integration\Api\Application\SessionApplicationApiIntegrationTestCase;

class NodeAutoDeployControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that an existing key with write permission for nodes is handed back rather
     * than a second one being created for the same user.
     */
    public function testExistingKeyIsReused()
    {
        $node = $this->createServerModel()->node;
        $key = $this->getApiKey();

        $response = $this->postJson("/api/application/nodes/$node->id/auto-deploy-token");
        $response->assertOk();
        $response->assertJsonPath('node', $node->id);
        $response->assertJsonPath('token', $key->identifier . decrypt($key->token));

        $this->assertSame(1, ApiKey::query()->where('user_id', $this->getApiUser()->id)->count());
    }

    /**
     * Test that a key is created when the user has none that can write to nodes.
     */
    public function testKeyIsCreatedWhenNoneExists()
    {
        $node = $this->createServerModel()->node;
        ApiKey::query()->where('user_id', $this->getApiUser()->id)->delete();

        $response = $this->postJson("/api/application/nodes/$node->id/auto-deploy-token");
        $response->assertOk();
        $response->assertJsonPath('node', $node->id);

        $key = ApiKey::query()->where('user_id', $this->getApiUser()->id)->firstOrFail();
        $this->assertSame(ApiKey::TYPE_APPLICATION, $key->key_type);
        $this->assertSame(AdminAcl::READ | AdminAcl::WRITE, $key->r_nodes);
        $this->assertSame('Automatically generated node deployment key.', $key->memo);
        $response->assertJsonPath('token', $key->identifier . decrypt($key->token));
    }

    /**
     * Test that a key that can only read nodes is not handed out as a deployment token.
     */
    public function testKeyWithoutWritePermissionIsNotReused()
    {
        $node = $this->createServerModel()->node;
        ApiKey::query()->where('user_id', $this->getApiUser()->id)->delete();
        $readOnly = $this->createApiKey($this->getApiUser(), ['r_nodes' => AdminAcl::READ]);

        $response = $this->postJson("/api/application/nodes/$node->id/auto-deploy-token");
        $response->assertOk();

        $this->assertNotSame($readOnly->identifier, substr($response->json('token'), 0, strlen($readOnly->identifier)));
        $this->assertSame(2, ApiKey::query()->where('user_id', $this->getApiUser()->id)->count());
    }

    /**
     * Test that an application API key cannot mint a deployment token.
     */
    public function testApiKeyCannotCreateDeploymentToken()
    {
        $node = $this->createServerModel()->node;

        $this->usingApiKey()->postJson("/api/application/nodes/$node->id/auto-deploy-token")
            ->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /**
     * Test that a node that does not exist is reported as such.
     */
    public function testMissingNodeReturnsNotFound()
    {
        $this->postJson('/api/application/nodes/12345/auto-deploy-token')->assertNotFound();
    }
}
