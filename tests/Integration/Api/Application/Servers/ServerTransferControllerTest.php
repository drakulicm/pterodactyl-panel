<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Servers;

use Mockery\MockInterface;
use Pterodactyl\Models\Node;
use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\ServerTransfer;
use Pterodactyl\Repositories\Wings\DaemonTransferRepository;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class ServerTransferControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that a transfer is recorded and the source node is notified.
     */
    public function testTransferIsStarted()
    {
        $server = $this->createServerModel();
        $node = $this->createTargetNode();
        $allocation = Allocation::factory()->create(['node_id' => $node->id]);
        $additional = Allocation::factory()->create(['node_id' => $node->id]);

        $this->mockDaemonTransfer();

        $response = $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'allocation_additional' => [$additional->id],
        ]);
        $response->assertStatus(Response::HTTP_ACCEPTED);

        $transfer = ServerTransfer::query()->where('server_id', $server->id)->firstOrFail();
        $this->assertSame($server->node_id, $transfer->old_node);
        $this->assertSame($node->id, $transfer->new_node);
        $this->assertSame($server->allocation_id, $transfer->old_allocation);
        $this->assertSame($allocation->id, $transfer->new_allocation);
        $this->assertSame([$additional->id], $transfer->new_additional_allocations);

        // The allocations are claimed up front so nothing else can be assigned them
        // while the transfer is in flight.
        $this->assertSame($server->id, $allocation->refresh()->server_id);
        $this->assertSame($server->id, $additional->refresh()->server_id);
    }

    /**
     * Test that a server cannot be transferred to the node it already runs on.
     */
    public function testServerCannotBeTransferredToItsOwnNode()
    {
        $server = $this->createServerModel();
        $allocation = Allocation::factory()->create(['node_id' => $server->node_id]);

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $server->node_id,
            'allocation_id' => $allocation->id,
        ])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', 'A server cannot be transferred to the node it is already running on.');
    }

    /**
     * Test that an allocation belonging to a different node than the transfer target is
     * rejected.
     */
    public function testAllocationOnAnotherNodeIsRejected()
    {
        $server = $this->createServerModel();
        $node = $this->createTargetNode();
        $elsewhere = Allocation::factory()->create(['node_id' => $server->node_id]);

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $elsewhere->id,
        ])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath(
                'errors.0.detail',
                'One or more of the selected allocations do not exist on the target node or are already assigned to a server.',
            );
    }

    /**
     * Test that an additional allocation that is already assigned to a server is
     * rejected, not just the primary one.
     */
    public function testAdditionalAllocationInUseIsRejected()
    {
        $server = $this->createServerModel();
        $node = $this->createTargetNode();
        $allocation = Allocation::factory()->create(['node_id' => $node->id]);
        $taken = Allocation::factory()->create(['node_id' => $node->id, 'server_id' => $server->id]);

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'allocation_additional' => [$taken->id],
        ])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath(
                'errors.0.detail',
                'One or more of the selected allocations do not exist on the target node or are already assigned to a server.',
            );
    }

    /**
     * Test that a node without the memory to hold the server is rejected.
     */
    public function testNodeWithoutCapacityIsRejected()
    {
        $server = $this->createServerModel();
        $node = $this->createTargetNode(['memory' => 64]);
        $allocation = Allocation::factory()->create(['node_id' => $node->id]);

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
        ])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', trans('admin/server.alerts.transfer_not_viable'));
    }

    /**
     * Test that a server that has not finished installing cannot be transferred.
     */
    public function testServerThatIsNotInstalledCannotBeTransferred()
    {
        $server = $this->createServerModel(['status' => Server::STATUS_INSTALLING]);
        $node = $this->createTargetNode();
        $allocation = Allocation::factory()->create(['node_id' => $node->id]);

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
        ])->assertStatus(Response::HTTP_CONFLICT);
    }

    /**
     * Test that a transfer without a node or allocation is rejected by validation.
     */
    public function testTransferWithoutANodeIsRejected()
    {
        $server = $this->createServerModel();

        $this->postJson("/api/application/servers/$server->id/transfer", [])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that a node and allocation that do not exist are rejected by validation.
     *
     * This lives in its own test because the exception handler rolls every open
     * transaction back to level zero when it renders an error, which would discard the
     * server created above before a second request could be made against it.
     */
    public function testTransferToANodeThatDoesNotExistIsRejected()
    {
        $server = $this->createServerModel();

        $this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => 12345,
            'allocation_id' => 12345,
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that a key without permission to write servers cannot start a transfer.
     */
    public function testKeyWithoutPermissionCannotTransfer()
    {
        $server = $this->createServerModel();
        $node = $this->createTargetNode();
        $allocation = Allocation::factory()->create(['node_id' => $node->id]);
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_servers' => 0]);

        $this->assertAccessDeniedJson($this->postJson("/api/application/servers/$server->id/transfer", [
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
        ]));
    }

    /**
     * Creates a node in its own location that the test server can be transferred to.
     */
    private function createTargetNode(array $attributes = []): Node
    {
        return Node::factory()->create(array_merge([
            'location_id' => Location::factory()->create()->id,
        ], $attributes));
    }

    /**
     * Mocks the call notifying the source node of the pending transfer.
     */
    private function mockDaemonTransfer(): void
    {
        $this->mock(DaemonTransferRepository::class, function (MockInterface $mock) {
            $mock->expects('setServer')->andReturnSelf();
            $mock->expects('notify')->andReturnNull();
        });
    }
}
