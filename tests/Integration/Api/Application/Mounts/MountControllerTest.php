<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Mounts;

use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Response;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\MountServer;
use Pterodactyl\Tests\Integration\Api\Application\SessionApplicationApiIntegrationTestCase;

class MountControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that mounts are returned with their relationship counts.
     */
    public function testGetMounts()
    {
        $mount = $this->createMount();

        $response = $this->getJson('/api/application/mounts');
        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.object', 'mount');
        $response->assertJsonPath('data.0.attributes.uuid', $mount->uuid);
        $response->assertJsonPath('data.0.attributes.eggs_count', 0);
    }

    /**
     * Test that a mount can be created, updated and deleted.
     */
    public function testMountLifecycle()
    {
        $response = $this->postJson('/api/application/mounts', [
            'name' => 'Shared Data',
            'source' => '/srv/shared',
            'target' => '/mnt/shared',
            'read_only' => true,
        ]);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('attributes.read_only', true);

        $id = $response->json('attributes.id');
        $this->patchJson('/api/application/mounts/' . $id, [
            'name' => 'Shared Data',
            'source' => '/srv/other',
            'target' => '/mnt/shared',
        ])->assertOk()->assertJsonPath('attributes.source', '/srv/other');

        $this->deleteJson('/api/application/mounts/' . $id)->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('mounts', ['id' => $id]);
    }

    /**
     * Test that blacklisted paths are rejected.
     */
    public function testInvalidPathsAreRejected()
    {
        $this->postJson('/api/application/mounts', [
            'name' => 'Bad', 'source' => '/etc/pterodactyl', 'target' => '/home/container',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that eggs can be attached to and detached from a mount.
     */
    public function testEggsCanBeAttachedAndDetached()
    {
        $mount = $this->createMount();
        $egg = Egg::query()->firstOrFail();

        $this->postJson("/api/application/mounts/$mount->id/eggs", ['eggs' => [$egg->id]])
            ->assertOk()
            ->assertJsonPath('attributes.eggs_count', 1);

        $this->deleteJson("/api/application/mounts/$mount->id/eggs/$egg->id")->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertSame(0, $mount->eggs()->count());
    }

    /**
     * Test that a mount cannot be deleted while it is attached to a server.
     *
     * The exception handler rolls every open transaction back to level zero when it
     * renders an error, which discards the rows this test created, so the mount cannot
     * be asserted against the database afterwards. Deletion of an unused mount is
     * covered by testMountLifecycle().
     */
    public function testMountWithServersCannotBeDeleted()
    {
        $mount = $this->createMount();
        $server = $this->createServerModel();
        (new MountServer())->forceFill(['mount_id' => $mount->id, 'server_id' => $server->id])->save();

        $this->deleteJson('/api/application/mounts/' . $mount->id)
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', 'Cannot delete a mount that is currently attached to one or more servers.');
    }

    /**
     * Test that mounts cannot be accessed using an API key.
     */
    public function testApiKeyCannotAccessMounts()
    {
        $this->usingApiKey();

        $this->assertAccessDeniedJson($this->getJson('/api/application/mounts'));
    }

    private function createMount(): Mount
    {
        $mount = (new Mount())->forceFill([
            'uuid' => Uuid::uuid4()->toString(),
            'name' => 'Test Mount',
            'description' => null,
            'source' => '/srv/test',
            'target' => '/mnt/test',
            'read_only' => false,
            'user_mountable' => false,
        ]);
        $mount->saveOrFail();

        return $mount;
    }
}
