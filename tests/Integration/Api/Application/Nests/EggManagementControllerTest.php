<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nests;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class EggManagementControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that an egg can be created inside a nest.
     */
    public function testEggCanBeCreated()
    {
        $nest = $this->getNest();

        $response = $this->postJson("/api/application/nests/$nest->id/eggs", $this->eggAttributes());
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('object', 'egg');
        $response->assertJsonPath('attributes.name', 'Test Egg');
        $response->assertJsonPath('attributes.nest', $nest->id);
        $response->assertJsonPath('attributes.startup', './start.sh');
        $response->assertJsonPath('meta.resource', route('api.application.nests.eggs.view', [
            'nest' => $nest->id,
            'egg' => $response->json('attributes.id'),
        ]));

        $egg = Egg::query()->findOrFail($response->json('attributes.id'));
        $this->assertSame($nest->id, $egg->nest_id);
        $this->assertSame(['ghcr.io/pterodactyl/yolks:java_21' => 'ghcr.io/pterodactyl/yolks:java_21'], $egg->docker_images);
    }

    /**
     * Test that a list of images is stored as a name to image map, which is what the
     * Blade admin and the panel itself expect.
     */
    public function testDockerImageListIsConvertedToAMap()
    {
        $nest = $this->getNest();

        $response = $this->postJson("/api/application/nests/$nest->id/eggs", $this->eggAttributes([
            'docker_images' => ['Java 21|ghcr.io/pterodactyl/yolks:java_21'],
        ]));
        $response->assertStatus(Response::HTTP_CREATED);

        $egg = Egg::query()->findOrFail($response->json('attributes.id'));
        $this->assertSame([
            'Java 21|ghcr.io/pterodactyl/yolks:java_21' => 'Java 21|ghcr.io/pterodactyl/yolks:java_21',
        ], $egg->docker_images);
    }

    /**
     * Test that an egg is rejected when it neither carries its own configuration nor
     * inherits one.
     */
    public function testEggWithoutConfigurationIsRejected()
    {
        $nest = $this->getNest();
        $attributes = $this->eggAttributes();
        unset($attributes['config_stop'], $attributes['config_startup'], $attributes['config_logs'], $attributes['config_files']);

        $this->postJson("/api/application/nests/$nest->id/eggs", $attributes)
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that an egg can be updated.
     */
    public function testEggCanBeUpdated()
    {
        $egg = $this->createEgg();

        $response = $this->patchJson("/api/application/nests/$egg->nest_id/eggs/$egg->id", $this->eggAttributes([
            'name' => 'Renamed Egg',
            'startup' => './other.sh',
        ]));
        $response->assertOk();
        $response->assertJsonPath('attributes.name', 'Renamed Egg');
        $response->assertJsonPath('attributes.startup', './other.sh');

        $this->assertSame('Renamed Egg', $egg->refresh()->name);
    }

    /**
     * Test that the install script of an egg can be updated on its own.
     */
    public function testInstallScriptCanBeUpdated()
    {
        $egg = $this->createEgg();

        $response = $this->patchJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/script", [
            'script_install' => "#!/bin/ash\necho hello",
            'script_is_privileged' => false,
            'script_entry' => 'ash',
            'script_container' => 'ghcr.io/pterodactyl/installers:alpine',
        ]);
        $response->assertOk();
        $response->assertJsonPath('attributes.script.privileged', false);
        $response->assertJsonPath('attributes.script.entry', 'ash');
        $response->assertJsonPath('attributes.script.container', 'ghcr.io/pterodactyl/installers:alpine');

        $egg->refresh();
        $this->assertSame("#!/bin/ash\necho hello", $egg->script_install);
        $this->assertFalse($egg->script_is_privileged);
    }

    /**
     * Test that an egg is exported as a JSON file that can be downloaded.
     */
    public function testEggCanBeExported()
    {
        $egg = $this->createEgg(['name' => 'Exported Egg']);

        $response = $this->get("/api/application/nests/$egg->nest_id/eggs/$egg->id/export");
        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/json');
        $response->assertHeader('Content-Disposition', 'attachment; filename=egg-exported-egg.json');

        $exported = json_decode($response->getContent(), true);
        $this->assertSame(Egg::EXPORT_VERSION, $exported['meta']['version']);
        $this->assertSame('Exported Egg', $exported['name']);
        $this->assertSame('./start.sh', $exported['startup']);
    }

    /**
     * Test that an exported egg can be imported back over an existing egg, and that
     * variables which are no longer present are removed.
     */
    public function testEggCanBeUpdatedFromAnExport()
    {
        $egg = $this->createEgg();
        $egg->variables()->create([
            'name' => 'Removed',
            'description' => '',
            'env_variable' => 'REMOVED',
            'default_value' => 'x',
            'user_viewable' => true,
            'user_editable' => true,
            'rules' => 'required|string',
        ]);

        $exported = json_decode($this->get("/api/application/nests/$egg->nest_id/eggs/$egg->id/export")->getContent(), true);
        $exported['name'] = 'Imported Egg';
        $exported['startup'] = './imported.sh';
        $exported['variables'] = [[
            'name' => 'Added',
            'description' => 'Added by the import',
            'env_variable' => 'ADDED',
            'default_value' => 'y',
            'user_viewable' => true,
            'user_editable' => false,
            'rules' => 'required|string',
        ]];

        $response = $this->putJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/import", $exported);
        $response->assertOk();
        $response->assertJsonPath('attributes.name', 'Imported Egg');
        $response->assertJsonPath('attributes.startup', './imported.sh');

        $variables = $egg->refresh()->variables;
        $this->assertCount(1, $variables);
        $this->assertSame('ADDED', $variables->first()->env_variable);
        $this->assertDatabaseMissing('egg_variables', ['egg_id' => $egg->id, 'env_variable' => 'REMOVED']);
    }

    /**
     * Test that an import without a file or a versioned meta block is rejected.
     */
    public function testImportWithoutAVersionIsRejected()
    {
        $egg = $this->createEgg();

        $this->putJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/import", ['name' => 'No meta'])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that an egg can be deleted.
     */
    public function testEggCanBeDeleted()
    {
        $egg = $this->createEgg();

        $this->deleteJson("/api/application/nests/$egg->nest_id/eggs/$egg->id")
            ->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('eggs', ['id' => $egg->id]);
    }

    /**
     * Test that an egg still used by a server is not deleted.
     */
    public function testEggWithServersCannotBeDeleted()
    {
        $server = $this->createServerModel();

        $this->deleteJson("/api/application/nests/$server->nest_id/eggs/$server->egg_id")
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', trans('exceptions.nest.egg.delete_has_servers'));
    }

    /**
     * Test that an egg that other eggs take their configuration from is not deleted.
     */
    public function testEggWithChildrenCannotBeDeleted()
    {
        $parent = $this->createEgg();
        $this->createEgg(['config_from' => $parent->id, 'nest_id' => $parent->nest_id]);

        $this->deleteJson("/api/application/nests/$parent->nest_id/eggs/$parent->id")
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', trans('exceptions.nest.egg.has_children'));
    }

    /**
     * Test that an egg belonging to another nest is not reachable through this one.
     */
    public function testEggIsScopedToItsNest()
    {
        $egg = $this->createEgg();
        $other = Nest::factory()->create();

        $this->patchJson("/api/application/nests/$other->id/eggs/$egg->id", $this->eggAttributes())
            ->assertNotFound();
    }

    /**
     * Test that a key without permission to write eggs cannot create one.
     */
    public function testKeyWithoutPermissionCannotCreateEgg()
    {
        $nest = $this->getNest();
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_eggs' => 0]);

        $this->assertAccessDeniedJson(
            $this->postJson("/api/application/nests/$nest->id/eggs", $this->eggAttributes()),
        );
    }

    private function getNest(): Nest
    {
        return Nest::query()->firstOrFail();
    }

    private function createEgg(array $attributes = []): Egg
    {
        return Egg::factory()->create(array_merge([
            'nest_id' => $this->getNest()->id,
            'author' => 'eggs@example.com',
            'name' => 'Test Egg',
            'startup' => './start.sh',
            'docker_images' => ['ghcr.io/pterodactyl/yolks:java_21' => 'ghcr.io/pterodactyl/yolks:java_21'],
            'config_stop' => 'stop',
            'config_startup' => '{"done": "Done"}',
            'config_logs' => '{}',
            'config_files' => '{}',
        ], $attributes));
    }

    private function eggAttributes(array $attributes = []): array
    {
        return array_merge([
            'name' => 'Test Egg',
            'description' => 'An egg used by the integration tests.',
            'docker_images' => ['ghcr.io/pterodactyl/yolks:java_21'],
            'startup' => './start.sh',
            'config_stop' => 'stop',
            'config_startup' => ['done' => 'Done'],
            'config_logs' => [],
            'config_files' => [],
        ], $attributes);
    }
}
