<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nodes;

use Mockery\MockInterface;
use Pterodactyl\Models\Node;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class NodeSystemInformationControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that the system information reported by Wings is returned for a node.
     */
    public function testSystemInformationIsReturned()
    {
        $node = $this->createServerModel()->node;

        $this->mockSystemInformation($node, [
            'version' => '1.13.3',
            'os' => 'linux',
            'architecture' => 'amd64',
            'kernel_version' => '6.8.0-45-generic',
            'cpu_count' => 8,
        ]);

        $response = $this->getJson("/api/application/nodes/$node->id/system-information");
        $response->assertOk();
        $response->assertJsonPath('version', '1.13.3');
        $response->assertJsonPath('system.type', 'Linux');
        $response->assertJsonPath('system.arch', 'amd64');
        $response->assertJsonPath('system.release', '6.8.0-45-generic');
        $response->assertJsonPath('system.cpus', 8);
    }

    /**
     * Test that an older Wings that omits fields is reported with placeholders rather
     * than as a server error.
     */
    public function testMissingFieldsAreReplacedWithPlaceholders()
    {
        $node = $this->createServerModel()->node;

        $this->mockSystemInformation($node, []);

        $response = $this->getJson("/api/application/nodes/$node->id/system-information");
        $response->assertOk();
        $response->assertJsonPath('version', '');
        $response->assertJsonPath('system.type', 'Unknown');
        $response->assertJsonPath('system.arch', '--');
        $response->assertJsonPath('system.release', '--');
        $response->assertJsonPath('system.cpus', 0);
    }

    /**
     * Test that a key without permission to read nodes cannot read the system information.
     */
    public function testKeyWithoutPermissionCannotReadSystemInformation()
    {
        $node = $this->createServerModel()->node;
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_nodes' => 0]);

        $this->getJson("/api/application/nodes/$node->id/system-information")->assertForbidden();
    }

    /**
     * Mocks the Wings call made to read the system information of a node.
     */
    private function mockSystemInformation(Node $node, array $data): void
    {
        $this->mock(DaemonConfigurationRepository::class, function (MockInterface $mock) use ($node, $data) {
            $mock->expects('setNode')->with(\Mockery::on(fn ($value) => $value->is($node)))->andReturnSelf();
            $mock->expects('getSystemInformation')->andReturns($data);
        });
    }
}
