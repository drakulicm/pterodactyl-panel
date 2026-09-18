<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nests;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class NestManagementControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that a nest can be created, updated and deleted.
     */
    public function testNestLifecycle()
    {
        $response = $this->postJson('/api/application/nests', ['name' => 'Test Nest', 'description' => 'Testing']);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('object', 'nest');
        $response->assertJsonPath('attributes.author', config('pterodactyl.service.author'));

        $id = $response->json('attributes.id');
        $this->patchJson('/api/application/nests/' . $id, ['name' => 'Renamed Nest'])
            ->assertOk()
            ->assertJsonPath('attributes.name', 'Renamed Nest');

        $this->deleteJson('/api/application/nests/' . $id)->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('nests', ['id' => $id]);
    }

    /**
     * Test that an egg, including a variable, can be managed and then exported & imported.
     */
    public function testEggLifecycle()
    {
        $nest = Nest::factory()->create();

        $response = $this->postJson("/api/application/nests/$nest->id/eggs", [
            'name' => 'Test Egg',
            'docker_images' => ['Java' => 'ghcr.io/pterodactyl/yolks:java_21'],
            'startup' => 'java -jar server.jar',
            'config_stop' => 'stop',
            'config_startup' => ['done' => 'Done'],
            'config_logs' => [],
            'config_files' => [],
            'features' => ['eula'],
        ]);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('attributes.nest', $nest->id);
        $response->assertJsonPath('attributes.features', ['eula']);
        $response->assertJsonPath('attributes.config.startup.done', 'Done');

        $egg = Egg::query()->findOrFail($response->json('attributes.id'));
        $base = "/api/application/nests/$nest->id/eggs/$egg->id";

        $this->patchJson("$base/script", [
            'script_install' => 'echo "hello"',
            'script_is_privileged' => true,
            'script_entry' => 'ash',
            'script_container' => 'alpine:3.4',
        ])->assertOk()->assertJsonPath('attributes.script.install', 'echo "hello"');

        $variable = $this->postJson("$base/variables", [
            'name' => 'Server Jar',
            'env_variable' => 'SERVER_JARFILE',
            'rules' => 'required|string',
            'default_value' => 'server.jar',
            'user_viewable' => true,
        ]);
        $variable->assertStatus(Response::HTTP_CREATED);
        $variable->assertJsonPath('attributes.user_viewable', true);
        $variable->assertJsonPath('attributes.user_editable', false);

        $export = $this->get("$base/export")->assertOk();
        $export->assertHeader('Content-Disposition', 'attachment; filename=egg-test-egg.json');

        $imported = $this->call('POST', "/api/application/nests/$nest->id/import", [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
        ], $export->getContent());
        $imported->assertStatus(Response::HTTP_CREATED);
        $this->assertDatabaseHas('egg_variables', [
            'egg_id' => $imported->json('attributes.id'),
            'env_variable' => 'SERVER_JARFILE',
        ]);

        $variableId = $variable->json('attributes.id');
        $this->deleteJson("$base/variables/$variableId")->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertNull(EggVariable::query()->find($variableId));

        $this->deleteJson($base)->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('eggs', ['id' => $egg->id]);
    }

    /**
     * Test that an egg cannot be accessed through a nest it does not belong to.
     */
    public function testEggIsScopedToNest()
    {
        $nest = Nest::factory()->create();
        $egg = Egg::query()->where('nest_id', '!=', $nest->id)->firstOrFail();

        $this->assertNotFoundJson($this->deleteJson("/api/application/nests/$nest->id/eggs/$egg->id"));
    }

    /**
     * Test that a key with only read permissions cannot modify nests or eggs.
     */
    public function testReadOnlyKeyCannotWrite()
    {
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_nests' => 1, 'r_eggs' => 1]);
        $egg = Egg::query()->firstOrFail();

        $this->assertAccessDeniedJson($this->postJson('/api/application/nests', ['name' => 'Test']));
        $this->assertAccessDeniedJson($this->deleteJson("/api/application/nests/$egg->nest_id/eggs/$egg->id"));
        $this->get("/api/application/nests/$egg->nest_id/eggs/$egg->id/export")->assertOk();
    }
}
