<?php

namespace Pterodactyl\Tests\Integration\Api\Application\Settings;

use Illuminate\Http\Response;
use Pterodactyl\Tests\Integration\Api\Application\SessionApplicationApiIntegrationTestCase;

class SettingsControllerTest extends SessionApplicationApiIntegrationTestCase
{
    /**
     * Test that the general settings are returned.
     */
    public function testGetGeneralSettings()
    {
        $response = $this->getJson('/api/application/settings/general');

        $response->assertOk();
        $response->assertJsonPath('object', 'settings');
        $response->assertJsonPath('attributes.app:name', config('app.name'));
        $response->assertJsonStructure(['meta' => ['languages', 'environment_only']]);
    }

    /**
     * Test that the general settings can be updated.
     */
    public function testUpdateGeneralSettings()
    {
        $this->patchJson('/api/application/settings/general', [
            'app:name' => 'Test Panel',
            'app:locale' => 'en',
            'pterodactyl:auth:2fa_required' => 1,
        ])->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::app:name', 'value' => 'Test Panel']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::pterodactyl:auth:2fa_required', 'value' => '1']);
    }

    /**
     * Test that secrets are never included in the responses.
     */
    public function testSecretsAreNotReturned()
    {
        config()->set('mail.mailers.smtp.password', 'secret-password');
        config()->set('recaptcha.secret_key', 'secret-key');

        $mail = $this->getJson('/api/application/settings/mail')->assertOk();
        $mail->assertJsonPath('attributes.has_password', true);
        $this->assertStringNotContainsString('secret-password', $mail->getContent());

        $advanced = $this->getJson('/api/application/settings/advanced')->assertOk();
        $advanced->assertJsonPath('attributes.has_recaptcha_secret_key', true);
        $this->assertStringNotContainsString('secret-key', $advanced->getContent());
    }

    /**
     * Test that mail settings can only be changed when using the SMTP driver.
     */
    public function testMailSettingsRequireSmtpDriver()
    {
        config()->set('mail.default', 'log');

        $this->patchJson('/api/application/settings/mail', [
            'mail:mailers:smtp:host' => 'smtp.example.com',
            'mail:mailers:smtp:port' => 587,
            'mail:mailers:smtp:encryption' => 'tls',
            'mail:from:address' => 'panel@example.com',
        ])->assertStatus(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Test that the mail password is encrypted and the reCAPTCHA secret is kept when omitted.
     */
    public function testSecretsAreStoredCorrectly()
    {
        config()->set('mail.default', 'smtp');

        $this->patchJson('/api/application/settings/mail', [
            'mail:mailers:smtp:host' => 'smtp.example.com',
            'mail:mailers:smtp:port' => 587,
            'mail:mailers:smtp:encryption' => 'tls',
            'mail:mailers:smtp:password' => 'secret-password',
            'mail:from:address' => 'panel@example.com',
        ])->assertStatus(Response::HTTP_NO_CONTENT);

        $value = \DB::table('settings')->where('key', 'settings::mail:mailers:smtp:password')->value('value');
        $this->assertNotSame('secret-password', $value);
        $this->assertSame('secret-password', decrypt($value));

        $this->patchJson('/api/application/settings/advanced', [
            'recaptcha:enabled' => false,
            'recaptcha:website_key' => 'website-key',
            'pterodactyl:guzzle:timeout' => 15,
            'pterodactyl:guzzle:connect_timeout' => 5,
            'pterodactyl:client_features:allocations:enabled' => false,
        ])->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::recaptcha:enabled', 'value' => 'false']);
        $this->assertDatabaseMissing('settings', ['key' => 'settings::recaptcha:secret_key']);
    }

    /**
     * Test that settings cannot be accessed using an API key.
     */
    public function testApiKeyCannotAccessSettings()
    {
        $this->usingApiKey();

        $this->assertAccessDeniedJson($this->getJson('/api/application/settings/general'));
        $this->assertAccessDeniedJson($this->patchJson('/api/application/settings/general', []));
    }
}
