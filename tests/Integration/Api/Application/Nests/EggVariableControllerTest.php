<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Nests;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Illuminate\Http\Response;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class EggVariableControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * Test that the variables defined for an egg are listed.
     */
    public function testVariablesAreListed()
    {
        $egg = $this->createEgg();
        $variable = $this->createVariable($egg);

        $response = $this->getJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables");
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        // The object name is 'egg' rather than 'egg_variable' because the upstream
        // transformer reports Egg::RESOURCE_NAME. See ADMIN_API.md.
        $response->assertJsonPath('data.0.object', 'egg');
        $response->assertJsonPath('data.0.attributes.env_variable', $variable->env_variable);
        $response->assertJsonPath('data.0.attributes.rules', 'required|string');
    }

    /**
     * Test that a variable can be created, updated and deleted.
     */
    public function testVariableLifecycle()
    {
        $egg = $this->createEgg();

        $response = $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
            'name' => 'Server Jar',
            'description' => 'The jar to boot.',
            'env_variable' => 'SERVER_JARFILE',
            'rules' => 'required|string',
            'default_value' => 'server.jar',
            'user_viewable' => true,
            'user_editable' => true,
        ]);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('attributes.env_variable', 'SERVER_JARFILE');
        $response->assertJsonPath('attributes.user_viewable', true);
        $response->assertJsonPath('attributes.user_editable', true);

        $id = $response->json('attributes.id');
        $this->patchJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables/$id", [
            'name' => 'Server Jar',
            'env_variable' => 'SERVER_JARFILE',
            'rules' => 'required|string',
            'default_value' => 'other.jar',
            'user_viewable' => true,
            'user_editable' => false,
        ])
            ->assertOk()
            ->assertJsonPath('attributes.default_value', 'other.jar')
            ->assertJsonPath('attributes.user_editable', false);

        $this->deleteJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables/$id")
            ->assertStatus(Response::HTTP_NO_CONTENT);
        $this->assertDatabaseMissing('egg_variables', ['id' => $id]);
    }

    /**
     * Test that omitting the visibility flags creates a variable that is hidden from
     * the client area rather than one that defaults to visible.
     */
    public function testVisibilityDefaultsToHidden()
    {
        $egg = $this->createEgg();

        $response = $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
            'name' => 'Hidden',
            'env_variable' => 'HIDDEN_VALUE',
            'rules' => 'required|string',
            'default_value' => 'x',
        ]);
        $response->assertStatus(Response::HTTP_CREATED);
        $response->assertJsonPath('attributes.user_viewable', false);
        $response->assertJsonPath('attributes.user_editable', false);
    }

    /**
     * Test that a variable name reserved by the panel is rejected.
     */
    public function testReservedVariableNameIsRejected()
    {
        $egg = $this->createEgg();

        $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
            'name' => 'Memory',
            'env_variable' => 'SERVER_MEMORY',
            'rules' => 'required|string',
            'default_value' => '1024',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that an environment variable name the shell cannot express is rejected.
     */
    public function testInvalidVariableNameIsRejected()
    {
        $egg = $this->createEgg();

        $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
            'name' => 'Bad',
            'env_variable' => 'not a valid name',
            'rules' => 'required|string',
            'default_value' => '',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Test that a validation rule the panel does not know is reported as a message the
     * admin can act on, rather than as a server error.
     */
    public function testUnknownValidationRuleIsReported()
    {
        $egg = $this->createEgg();

        $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
            'name' => 'Bad Rule',
            'env_variable' => 'BAD_RULE',
            'rules' => 'this_rule_does_not_exist',
            'default_value' => '',
        ])
            ->assertStatus(Response::HTTP_BAD_REQUEST)
            ->assertJsonPath('errors.0.detail', trans('exceptions.nest.variables.bad_validation_rule', [
                'rule' => 'this_rule_does_not_exist',
            ]));
    }

    /**
     * Test that renaming a variable onto the name of another variable of the same egg
     * is rejected, since the startup would then have two values for one name.
     */
    public function testEnvironmentVariableMustBeUniqueWithinTheEgg()
    {
        $egg = $this->createEgg();
        $existing = $this->createVariable($egg);
        $variable = $egg->variables()->create([
            'name' => 'Second',
            'description' => '',
            'env_variable' => 'SECOND_VALUE',
            'default_value' => 'value',
            'user_viewable' => true,
            'user_editable' => true,
            'rules' => 'required|string',
        ]);

        $this->patchJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables/$variable->id", [
            'name' => 'Second',
            'env_variable' => $existing->env_variable,
            'rules' => 'required|string',
            'default_value' => 'value',
        ])->assertStatus(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Test that a variable belonging to another egg is not reachable through this one.
     */
    public function testVariableIsScopedToItsEgg()
    {
        $egg = $this->createEgg();
        $other = $this->createEgg(['name' => 'Other Egg']);
        $variable = $this->createVariable($other);

        $this->deleteJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables/$variable->id")
            ->assertNotFound();
    }

    /**
     * Test that an egg belonging to another nest is not reachable through this one.
     */
    public function testEggIsScopedToItsNest()
    {
        $egg = $this->createEgg();
        $nest = Nest::factory()->create();

        $this->getJson("/api/application/nests/$nest->id/eggs/$egg->id/variables")->assertNotFound();
    }

    /**
     * Test that a key without permission to write eggs cannot create a variable.
     */
    public function testKeyWithoutPermissionCannotCreateVariable()
    {
        $egg = $this->createEgg();
        $this->createNewDefaultApiKey($this->getApiUser(), ['r_eggs' => 0]);

        $this->assertAccessDeniedJson(
            $this->postJson("/api/application/nests/$egg->nest_id/eggs/$egg->id/variables", [
                'name' => 'Denied',
                'env_variable' => 'DENIED',
                'rules' => 'required|string',
                'default_value' => '',
            ]),
        );
    }

    private function createEgg(array $attributes = []): Egg
    {
        return Egg::factory()->create(array_merge([
            'nest_id' => Nest::query()->firstOrFail()->id,
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

    private function createVariable(Egg $egg): EggVariable
    {
        return $egg->variables()->create([
            'name' => 'Existing',
            'description' => 'An existing variable.',
            'env_variable' => 'EXISTING_VALUE',
            'default_value' => 'value',
            'user_viewable' => true,
            'user_editable' => true,
            'rules' => 'required|string',
        ]);
    }
}
