<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Servers;

use Ramsey\Uuid\Uuid;
use Illuminate\Http\Response;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\MountServer;
use Pterodactyl\Tests\Integration\Api\Application\SessionApplicationApiIntegrationTestCase;

class ServerMountControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that only the mounts available to the egg and node of the server are listed.
     */
    public function testOnlyAvailableMountsAreListed()
    {
        $server = $this->createServerModel();
        $available = $this->createMount('Available');
        $available->eggs()->attach($server->egg_id);
        $available->nodes()->attach($server->node_id);

        $wrongEgg = $this->createMount('Wrong Egg');
        $wrongEgg->nodes()->attach($server->node_id);

        $wrongNode = $this->createMount('Wrong Node');
        $wrongNode->eggs()->attach($server->egg_id);

        $response = $this->getJson("/api/application/servers/$server->id/mounts");
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.object', 'mount');
        $response->assertJsonPath('data.0.attributes.name', 'Available');
        $response->assertJsonPath('meta.mounted', []);
    }

    /**
     * Test that a mount can be attached to and detached from a server.
     */
    public function testMountCanBeAttachedAndDetached()
    {
        $server = $this->createServerModel();
        $mount = $this->createMount();
        $mount->eggs()->attach($server->egg_id);
        $mount->nodes()->attach($server->node_id);

        $response = $this->postJson("/api/application/servers/$server->id/mounts", ['mount_id' => $mount->id]);
        $response->assertOk();
        $response->assertJsonPath('meta.mounted', [$mount->id]);
        $this->assertDatabaseHas('mount_server', ['mount_id' => $mount->id, 'server_id' => $server->id]);

        $this->deleteJson("/api/application/servers/$server->id/mounts/$mount->id")
            ->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('mount_server', ['mount_id' => $mount->id, 'server_id' => $server->id]);
    }

    /**
     * Test that attaching the same mount twice does not create a second row.
     */
    public function testAttachingTheSameMountTwiceIsIdempotent()
    {
        $server = $this->createServerModel();
        $mount = $this->createMount();
        $mount->eggs()->attach($server->egg_id);
        $mount->nodes()->attach($server->node_id);

        $this->postJson("/api/application/servers/$server->id/mounts", ['mount_id' => $mount->id])->assertOk();
        $this->postJson("/api/application/servers/$server->id/mounts", ['mount_id' => $mount->id])
            ->assertOk()
            ->assertJsonPath('meta.mounted', [$mount->id]);

        $this->assertSame(1, MountServer::query()->where('server_id', $server->id)->count());
    }

    /**
     * Test that a mount that is not available to the egg and node of the server is
     * rejected rather than silently attached.
     */
    public function testMountNotAvailableToTheServerIsRejected()
    {
        $server = $this->createServerModel();
        $mount = $this->createMount();
        $mount->nodes()->attach($server->node_id);

        $this->postJson("/api/application/servers/$server->id/mounts", ['mount_id' => $mount->id])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', 'This mount is not available to the egg and node used by this server.');
    }

    /**
     * Test that a mount that does not exist is rejected by validation.
     */
    public function testMissingMountIsRejected()
    {
        $server = $this->createServerModel();

        $this->postJson("/api/application/servers/$server->id/mounts", ['mount_id' => 12345])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that detaching a mount the server does not have is a not found error, rather
     * than reporting success for a mount that was never attached.
     */
    public function testDetachingAMountTheServerDoesNotHaveReturnsNotFound()
    {
        $server = $this->createServerModel();
        $mount = $this->createMount();

        $this->deleteJson("/api/application/servers/$server->id/mounts/$mount->id")->assertNotFound();
    }

    /**
     * Test that a mount attached to another server is left alone when it is detached
     * from this one.
     */
    public function testDetachingOnlyAffectsTheGivenServer()
    {
        $server = $this->createServerModel();
        $other = $this->createServerModel();
        $mount = $this->createMount();

        foreach ([$server, $other] as $target) {
            (new MountServer())->forceFill(['mount_id' => $mount->id, 'server_id' => $target->id])->saveOrFail();
        }

        $this->deleteJson("/api/application/servers/$server->id/mounts/$mount->id")
            ->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseMissing('mount_server', ['mount_id' => $mount->id, 'server_id' => $server->id]);
        $this->assertDatabaseHas('mount_server', ['mount_id' => $mount->id, 'server_id' => $other->id]);
    }

    /**
     * Test that server mounts cannot be read using an API key.
     */
    public function testApiKeyCannotAccessServerMounts()
    {
        $server = $this->createServerModel();

        $this->usingApiKey();
        $this->assertAccessDeniedJson($this->getJson("/api/application/servers/$server->id/mounts"));
    }

    private function createMount(string $name = 'Test Mount'): Mount
    {
        $mount = (new Mount())->forceFill([
            'uuid' => Uuid::uuid4()->toString(),
            'name' => $name,
            'description' => null,
            'source' => '/srv/' . Uuid::uuid4()->toString(),
            'target' => '/mnt/' . Uuid::uuid4()->toString(),
            'read_only' => false,
            'user_mountable' => false,
        ]);
        $mount->saveOrFail();

        return $mount;
    }
}
