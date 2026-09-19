<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class ServerInstallControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that an installed server is marked as installing again.
     */
    public function testInstalledServerIsMarkedAsInstalling()
    {
        $server = $this->createServerModel(['status' => null]);

        $response = $this->postJson("/api/application/servers/$server->id/toggle-install");
        $response->assertOk();
        $response->assertJsonPath('attributes.status', Server::STATUS_INSTALLING);

        $this->assertSame(Server::STATUS_INSTALLING, $server->refresh()->status);
    }

    /**
     * Test that a server stuck installing can be marked as installed.
     */
    public function testInstallingServerIsMarkedAsInstalled()
    {
        $server = $this->createServerModel(['status' => Server::STATUS_INSTALLING]);

        $response = $this->postJson("/api/application/servers/$server->id/toggle-install");
        $response->assertOk();
        $response->assertJsonPath('attributes.status', null);

        $this->assertNull($server->refresh()->status);
    }

    /**
     * Test that a server whose installation failed cannot be toggled, since doing so
     * would hide the failure rather than resolve it.
     *
     * The exception handler rolls every open transaction back to level zero when it
     * renders an error, so the server cannot be asserted against the database after the
     * request; the error message is the assertion instead.
     */
    public function testServerWithFailedInstallCannotBeToggled()
    {
        $server = $this->createServerModel(['status' => Server::STATUS_INSTALL_FAILED]);

        $this->postJson("/api/application/servers/$server->id/toggle-install")
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', trans('admin/server.exceptions.marked_as_failed'));
    }

    /**
     * Test that a key without permission to write servers cannot toggle the install state.
     */
    public function testKeyWithoutPermissionCannotToggleInstall()
    {
        $server = $this->createServerModel(['status' => null]);
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_servers' => 0]);

        $this->assertAccessDeniedJson($this->postJson("/api/application/servers/$server->id/toggle-install"));
    }
}
