<?php

namespace Pterodactyl\Tests\Integration\Api\Application\DatabaseHosts;

use Illuminate\Http\Response;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Transformers\Api\Application\DatabaseHostTransformer;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class DatabaseHostControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that the database hosts are returned as a paginated list.
     */
    public function testGetDatabaseHosts()
    {
        $hosts = DatabaseHost::factory()->times(2)->create();

        $response = $this->getJson('/api/application/database-hosts');
        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('object', 'list');
        $response->assertJsonPath('data.0.object', 'database_host');
        $response->assertJsonPath('data.0.attributes.id', $hosts[0]->id);
        $response->assertJsonPath('meta.pagination.total', 2);
    }

    /**
     * Test that a single database host can be returned.
     */
    public function testGetSingleDatabaseHost()
    {
        $host = DatabaseHost::factory()->create();

        $response = $this->getJson('/api/application/database-hosts/' . $host->id);
        $response->assertStatus(Response::HTTP_OK);
        $response->assertJson([
            'object' => 'database_host',
            'attributes' => $this->getTransformer(DatabaseHostTransformer::class)->transform($host),
        ], true);
        $response->assertJsonMissingPath('attributes.password');
    }

    /**
     * Test that validation errors are returned when creating a host.
     */
    public function testCreateDatabaseHostValidation()
    {
        $response = $this->postJson('/api/application/database-hosts', ['name' => 'Test']);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
        $response->assertJsonPath('errors.0.meta.source_field', 'host');
    }

    /**
     * Test that a database host without any databases can be deleted.
     */
    public function testDeleteDatabaseHost()
    {
        $host = DatabaseHost::factory()->create();

        $this->deleteJson('/api/application/database-hosts/' . $host->id)->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseMissing('database_hosts', ['id' => $host->id]);
    }

    /**
     * Test that a missing database host returns a 404 error.
     */
    public function testGetMissingDatabaseHost()
    {
        $this->assertNotFoundJson($this->getJson('/api/application/database-hosts/0'));
    }

    /**
     * Test that a key without permission cannot access or modify database hosts.
     */
    public function testErrorReturnedIfNoPermission()
    {
        $host = DatabaseHost::factory()->create();
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_database_hosts' => 0]);

        $this->assertAccessDeniedJson($this->getJson('/api/application/database-hosts/' . $host->id));
        $this->assertAccessDeniedJson($this->deleteJson('/api/application/database-hosts/' . $host->id));
    }

    /**
     * Test that a key with only read permission cannot delete a database host.
     */
    public function testReadOnlyKeyCannotWrite()
    {
        $host = DatabaseHost::factory()->create();
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_database_hosts' => 1]);

        $this->getJson('/api/application/database-hosts/' . $host->id)->assertOk();
        $this->assertAccessDeniedJson($this->deleteJson('/api/application/database-hosts/' . $host->id));
    }
}
