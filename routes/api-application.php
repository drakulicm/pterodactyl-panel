<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Api\Application;

/*
|--------------------------------------------------------------------------
| User Controller Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/application/users
|
*/

Route::group(['prefix' => '/users'], function () {
    Route::get('/', [Application\Users\UserController::class, 'index'])->name('api.application.users');
    Route::get('/{user:id}', [Application\Users\UserController::class, 'view'])->name('api.application.users.view');
    Route::get('/external/{external_id}', [Application\Users\ExternalUserController::class, 'index'])->name('api.application.users.external');

    Route::post('/', [Application\Users\UserController::class, 'store']);
    Route::patch('/{user:id}', [Application\Users\UserController::class, 'update']);

    Route::delete('/{user:id}', [Application\Users\UserController::class, 'delete']);
});

/*
|--------------------------------------------------------------------------
| Node Controller Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/application/nodes
|
*/
Route::group(['prefix' => '/nodes'], function () {
    Route::get('/', [Application\Nodes\NodeController::class, 'index'])->name('api.application.nodes');
    Route::get('/deployable', Application\Nodes\NodeDeploymentController::class);
    Route::get('/{node:id}', [Application\Nodes\NodeController::class, 'view'])->name('api.application.nodes.view');
    Route::get('/{node:id}/configuration', Application\Nodes\NodeConfigurationController::class);

    Route::post('/', [Application\Nodes\NodeController::class, 'store']);
    Route::patch('/{node:id}', [Application\Nodes\NodeController::class, 'update'])->name('api.application.nodes.update');

    Route::delete('/{node:id}', [Application\Nodes\NodeController::class, 'delete']);

    Route::group(['prefix' => '/{node:id}/allocations'], function () {
        Route::get('/', [Application\Nodes\AllocationController::class, 'index'])->name('api.application.allocations');
        Route::post('/', [Application\Nodes\AllocationController::class, 'store']);
        Route::delete('/{allocation:id}', [Application\Nodes\AllocationController::class, 'delete'])->name('api.application.allocations.view');
    });
});

/*
|--------------------------------------------------------------------------
| Location Controller Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/application/locations
|
*/
Route::group(['prefix' => '/locations'], function () {
    Route::get('/', [Application\Locations\LocationController::class, 'index'])->name('api.applications.locations');
    Route::get('/{location:id}', [Application\Locations\LocationController::class, 'view'])->name('api.application.locations.view');

    Route::post('/', [Application\Locations\LocationController::class, 'store']);
    Route::patch('/{location:id}', [Application\Locations\LocationController::class, 'update']);

    Route::delete('/{location:id}', [Application\Locations\LocationController::class, 'delete']);
});

/*
|--------------------------------------------------------------------------
| Server Controller Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/application/servers
|
*/
Route::group(['prefix' => '/servers'], function () {
    Route::get('/', [Application\Servers\ServerController::class, 'index'])->name('api.application.servers');
    Route::get('/{server:id}', [Application\Servers\ServerController::class, 'view'])->name('api.application.servers.view');
    Route::get('/external/{external_id}', [Application\Servers\ExternalServerController::class, 'index'])->name('api.application.servers.external');

    Route::patch('/{server:id}/details', [Application\Servers\ServerDetailsController::class, 'details'])->name('api.application.servers.details');
    Route::patch('/{server:id}/build', [Application\Servers\ServerDetailsController::class, 'build'])->name('api.application.servers.build');
    Route::patch('/{server:id}/startup', [Application\Servers\StartupController::class, 'index'])->name('api.application.servers.startup');

    Route::post('/', [Application\Servers\ServerController::class, 'store']);
    Route::post('/{server:id}/suspend', [Application\Servers\ServerManagementController::class, 'suspend'])->name('api.application.servers.suspend');
    Route::post('/{server:id}/unsuspend', [Application\Servers\ServerManagementController::class, 'unsuspend'])->name('api.application.servers.unsuspend');
    Route::post('/{server:id}/reinstall', [Application\Servers\ServerManagementController::class, 'reinstall'])->name('api.application.servers.reinstall');

    Route::delete('/{server:id}', [Application\Servers\ServerController::class, 'delete']);
    Route::delete('/{server:id}/{force?}', [Application\Servers\ServerController::class, 'delete']);

    // Database Management Endpoint
    Route::group(['prefix' => '/{server:id}/databases'], function () {
        Route::get('/', [Application\Servers\DatabaseController::class, 'index'])->name('api.application.servers.databases');
        Route::get('/{database:id}', [Application\Servers\DatabaseController::class, 'view'])->name('api.application.servers.databases.view');

        Route::post('/', [Application\Servers\DatabaseController::class, 'store']);
        Route::post('/{database:id}/reset-password', [Application\Servers\DatabaseController::class, 'resetPassword']);

        Route::delete('/{database:id}', [Application\Servers\DatabaseController::class, 'delete']);
    });
});

/*
|--------------------------------------------------------------------------
| Nest Controller Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/application/nests
|
*/
Route::group(['prefix' => '/nests'], function () {
    Route::get('/', [Application\Nests\NestController::class, 'index'])->name('api.application.nests');
    Route::get('/{nest:id}', [Application\Nests\NestController::class, 'view'])->name('api.application.nests.view');

    // Egg Management Endpoint
    Route::group(['prefix' => '/{nest:id}/eggs'], function () {
        Route::get('/', [Application\Nests\EggController::class, 'index'])->name('api.application.nests.eggs');
        Route::get('/{egg:id}', [Application\Nests\EggController::class, 'view'])->name('api.application.nests.eggs.view');
    });
});

/*
|--------------------------------------------------------------------------
| Administrative UI Routes
|--------------------------------------------------------------------------
|
| Everything below this point was added for the administrative area of the
| new UI. Routes are only ever appended here to keep this file easy to rebase
| onto upstream. Endpoints flagged as "session only" reject API keys.
|
*/

// Endpoint: /api/application/version (session only)
Route::get('/version', Application\VersionController::class)->name('api.application.version');

// Endpoint: /api/application/database-hosts
Route::group(['prefix' => '/database-hosts'], function () {
    Route::get('/', [Application\DatabaseHosts\DatabaseHostController::class, 'index'])->name('api.application.database-hosts');
    Route::get('/{host:id}', [Application\DatabaseHosts\DatabaseHostController::class, 'view'])->name('api.application.database-hosts.view');

    Route::post('/', [Application\DatabaseHosts\DatabaseHostController::class, 'store']);
    Route::patch('/{host:id}', [Application\DatabaseHosts\DatabaseHostController::class, 'update']);

    Route::delete('/{host:id}', [Application\DatabaseHosts\DatabaseHostController::class, 'delete']);
});

// Endpoint: /api/application/mounts (session only)
Route::group(['prefix' => '/mounts'], function () {
    Route::get('/', [Application\Mounts\MountController::class, 'index'])->name('api.application.mounts');
    Route::get('/{mount:id}', [Application\Mounts\MountController::class, 'view'])->name('api.application.mounts.view');

    Route::post('/', [Application\Mounts\MountController::class, 'store']);
    Route::post('/{mount:id}/eggs', [Application\Mounts\MountController::class, 'addEggs']);
    Route::post('/{mount:id}/nodes', [Application\Mounts\MountController::class, 'addNodes']);
    Route::patch('/{mount:id}', [Application\Mounts\MountController::class, 'update']);

    Route::delete('/{mount:id}', [Application\Mounts\MountController::class, 'delete']);
    Route::delete('/{mount:id}/eggs/{egg:id}', [Application\Mounts\MountController::class, 'deleteEgg']);
    Route::delete('/{mount:id}/nodes/{node:id}', [Application\Mounts\MountController::class, 'deleteNode']);
});

// Endpoint: /api/application/servers/{server}/mounts (session only)
Route::group(['prefix' => '/servers/{server:id}/mounts'], function () {
    Route::get('/', [Application\Servers\ServerMountController::class, 'index'])->name('api.application.servers.mounts');
    Route::post('/', [Application\Servers\ServerMountController::class, 'store']);
    Route::delete('/{mount:id}', [Application\Servers\ServerMountController::class, 'delete']);
});

// Endpoint: /api/application/servers/{server}
Route::group(['prefix' => '/servers/{server:id}'], function () {
    Route::post('/transfer', Application\Servers\ServerTransferController::class)->name('api.application.servers.transfer');
    Route::post('/toggle-install', Application\Servers\ServerInstallController::class)->name('api.application.servers.toggle-install');
});

// Endpoint: /api/application/nests
Route::group(['prefix' => '/nests'], function () {
    Route::post('/', [Application\Nests\NestManagementController::class, 'store']);
    Route::post('/{nest:id}/import', [Application\Nests\NestManagementController::class, 'import']);
    Route::patch('/{nest:id}', [Application\Nests\NestManagementController::class, 'update']);
    Route::delete('/{nest:id}', [Application\Nests\NestManagementController::class, 'delete']);

    // Endpoint: /api/application/nests/{nest}/eggs
    Route::group(['prefix' => '/{nest:id}/eggs'], function () {
        Route::get('/{egg:id}/export', [Application\Nests\EggManagementController::class, 'export'])->name('api.application.nests.eggs.export');

        Route::post('/', [Application\Nests\EggManagementController::class, 'store']);
        Route::put('/{egg:id}/import', [Application\Nests\EggManagementController::class, 'import']);
        Route::patch('/{egg:id}', [Application\Nests\EggManagementController::class, 'update']);
        Route::patch('/{egg:id}/script', [Application\Nests\EggManagementController::class, 'script']);

        Route::delete('/{egg:id}', [Application\Nests\EggManagementController::class, 'delete']);

        // Endpoint: /api/application/nests/{nest}/eggs/{egg}/variables
        Route::group(['prefix' => '/{egg:id}/variables'], function () {
            Route::get('/', [Application\Nests\EggVariableController::class, 'index'])->name('api.application.nests.eggs.variables');
            Route::post('/', [Application\Nests\EggVariableController::class, 'store']);
            Route::patch('/{variable:id}', [Application\Nests\EggVariableController::class, 'update']);
            Route::delete('/{variable:id}', [Application\Nests\EggVariableController::class, 'delete']);
        });
    });
});

// Endpoint: /api/application/nodes/{node}
Route::group(['prefix' => '/nodes/{node:id}'], function () {
    Route::get('/system-information', Application\Nodes\NodeSystemInformationController::class)->name('api.application.nodes.system-information');
    Route::post('/auto-deploy-token', Application\Nodes\NodeAutoDeployController::class)->name('api.application.nodes.auto-deploy-token');

    Route::patch('/allocations/{allocation:id}', [Application\Nodes\AllocationManagementController::class, 'update']);
    Route::delete('/allocations', [Application\Nodes\AllocationManagementController::class, 'delete']);
});

// Endpoint: /api/application/settings (session only)
Route::group(['prefix' => '/settings'], function () {
    Route::get('/general', [Application\Settings\SettingsController::class, 'general'])->name('api.application.settings.general');
    Route::patch('/general', [Application\Settings\SettingsController::class, 'updateGeneral']);

    Route::get('/mail', [Application\Settings\SettingsController::class, 'mail'])->name('api.application.settings.mail');
    Route::patch('/mail', [Application\Settings\SettingsController::class, 'updateMail']);
    Route::post('/mail/test', [Application\Settings\SettingsController::class, 'testMail']);

    Route::get('/advanced', [Application\Settings\SettingsController::class, 'advanced'])->name('api.application.settings.advanced');
    Route::patch('/advanced', [Application\Settings\SettingsController::class, 'updateAdvanced']);
});

// Endpoint: /api/application/api-keys (session only)
Route::group(['prefix' => '/api-keys'], function () {
    Route::get('/', [Application\ApiKeys\ApiKeyController::class, 'index'])->name('api.application.api-keys');
    Route::get('/resources', [Application\ApiKeys\ApiKeyController::class, 'resources'])->name('api.application.api-keys.resources');

    Route::post('/', [Application\ApiKeys\ApiKeyController::class, 'store']);

    Route::delete('/{identifier}', [Application\ApiKeys\ApiKeyController::class, 'delete']);
});
