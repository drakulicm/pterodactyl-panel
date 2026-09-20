<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nests;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Illuminate\Http\Client\Request;
use Pterodactyl\Models\EggVariable;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Services\Eggs\Sharing\EggExporterService;
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
     * Test that an egg can be imported by pasting a link to it, and that a link to the
     * file's page on GitHub is turned into the raw file behind it.
     */
    public function testEggCanBeImportedFromAUrl()
    {
        $nest = Nest::factory()->create();
        $document = $this->app->make(EggExporterService::class)->handle(Egg::query()->firstOrFail()->id);

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response($document, 200, ['Content-Type' => 'text/plain']),
        ]);

        $response = $this->postJson("/api/application/nests/$nest->id/import", [
            'import_url' => 'https://github.com/pelican-eggs/minecraft/blob/main/java/paper/egg-paper.json',
        ]);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('object', 'egg');
        $response->assertJsonPath('attributes.nest', $nest->id);
        $this->assertDatabaseHas('eggs', ['id' => $response->json('attributes.id'), 'nest_id' => $nest->id]);

        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://raw.githubusercontent.com/pelican-eggs/minecraft/main/java/paper/egg-paper.json';
        });
    }

    /**
     * Test that a URL which does not return JSON is reported rather than imported.
     */
    public function testImportFromAUrlThatIsNotJsonIsRejected()
    {
        $nest = Nest::factory()->create();

        Http::fake(['example.com/*' => Http::response('<html><body>Not an egg</body></html>', 200)]);

        $this->postJson("/api/application/nests/$nest->id/import", ['import_url' => 'https://example.com/eggs/paper'])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath(
                'errors.0.detail',
                'The URL https://example.com/eggs/paper did not return a JSON document. Paste a link to the egg file itself, for example the "Raw" link on GitHub.',
            );

        $this->assertDatabaseMissing('eggs', ['nest_id' => $nest->id]);
    }

    /**
     * Test that a URL the panel cannot download from is reported with the status code.
     */
    public function testImportFromAUrlThatCannotBeDownloadedIsRejected()
    {
        $nest = Nest::factory()->create();

        Http::fake(['example.com/*' => Http::response('Not Found', 404)]);

        $this->postJson("/api/application/nests/$nest->id/import", ['import_url' => 'https://example.com/missing.json'])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath(
                'errors.0.detail',
                'Could not download the egg from https://example.com/missing.json: the server responded with HTTP 404.',
            );
    }

    /**
     * Test that only http(s) links are accepted, and that no request is made otherwise.
     */
    public function testImportFromANonHttpUrlIsRejected()
    {
        $nest = Nest::factory()->create();

        Http::fake();

        $this->postJson("/api/application/nests/$nest->id/import", ['import_url' => 'ftp://example.com/egg.json'])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonPath('errors.0.meta.source_field', 'import_url');

        Http::assertNothingSent();
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
