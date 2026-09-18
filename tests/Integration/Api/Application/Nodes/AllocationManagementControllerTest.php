<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nodes;

use Pterodactyl\Models\Allocation;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class AllocationManagementControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that the alias of an allocation can be set and removed.
     */
    public function testAliasCanBeUpdated()
    {
        $server = $this->createServerModel();
        $allocation = Allocation::factory()->create(['node_id' => $server->node_id]);
        $url = "/api/application/nodes/$server->node_id/allocations/$allocation->id";

        $this->patchJson($url, ['ip_alias' => 'play.example.com'])->assertOk()->assertJsonPath('attributes.alias', 'play.example.com');
        $this->patchJson($url, ['ip_alias' => null])->assertOk()->assertJsonPath('attributes.alias', null);
    }

    /**
     * Test that allocations assigned to a server, or belonging to another node, are never removed.
     */
    public function testBulkDeleteSkipsAssignedAllocations()
    {
        $server = $this->createServerModel();
        $other = $this->createServerModel();
        $free = Allocation::factory()->times(2)->create(['node_id' => $server->node_id, 'ip' => '10.0.0.1']);
        $foreign = Allocation::factory()->create(['node_id' => $other->node_id]);

        $this->deleteJson("/api/application/nodes/$server->node_id/allocations", [
            'ids' => [$free[0]->id, $server->allocation_id, $foreign->id],
        ])->assertOk()->assertJsonPath('deleted', 1);

        $this->assertDatabaseHas('allocations', ['id' => $server->allocation_id]);
        $this->assertDatabaseHas('allocations', ['id' => $foreign->id]);

        $this->deleteJson("/api/application/nodes/$server->node_id/allocations", ['ip' => '10.0.0.1'])
            ->assertOk()->assertJsonPath('deleted', 1);
        $this->assertDatabaseMissing('allocations', ['id' => $free[1]->id]);
    }
}
