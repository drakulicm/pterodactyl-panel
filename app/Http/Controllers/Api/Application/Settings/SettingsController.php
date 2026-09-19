<?php

namespace Pterodactyl\Http\Controllers\Api\Application\Settings;

use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Notifications\MailTested;
use Illuminate\Support\Facades\Notification;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Traits\Helpers\AvailableLanguages;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Controllers\Api\Application\ApplicationApiController;
use Pterodactyl\Http\Requests\Api\Application\Settings\GetSettingsRequest;
use Pterodactyl\Http\Requests\Api\Application\Settings\SendTestMailRequest;
use Pterodactyl\Http\Requests\Api\Application\Settings\UpdateSettingsRequest;
use Pterodactyl\Http\Requests\Api\Application\Settings\UpdateMailSettingsRequest;
use Pterodactyl\Http\Requests\Api\Application\Settings\UpdateGeneralSettingsRequest;
use Pterodactyl\Http\Requests\Api\Application\Settings\UpdateAdvancedSettingsRequest;

class SettingsController extends ApplicationApiController
{
    use AvailableLanguages;

    /**
     * SettingsController constructor.
     */
    public function __construct(
        private Encrypter $encrypter,
        private Kernel $kernel,
        private SettingsRepositoryInterface $settings,
    ) {
        parent::__construct();
    }

    /**
     * Returns the basic Panel settings.
     */
    public function general(GetSettingsRequest $request): JsonResponse
    {
        return $this->respond([
            'app:name' => config('app.name'),
            'app:locale' => config('app.locale'),
            'pterodactyl:auth:2fa_required' => (int) config('pterodactyl.auth.2fa_required'),
        ], [
            'languages' => $this->getAvailableLanguages(true),
        ]);
    }

    /**
     * Handle the basic Panel settings being updated.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function updateGeneral(UpdateGeneralSettingsRequest $request): Response
    {
        return $this->persist($request);
    }

    /**
     * Returns the SMTP mail settings. The stored password is never returned.
     */
    public function mail(GetSettingsRequest $request): JsonResponse
    {
        return $this->respond([
            'mail:mailers:smtp:host' => config('mail.mailers.smtp.host'),
            'mail:mailers:smtp:port' => (int) config('mail.mailers.smtp.port'),
            'mail:mailers:smtp:encryption' => config('mail.mailers.smtp.encryption'),
            'mail:mailers:smtp:username' => config('mail.mailers.smtp.username'),
            'mail:from:address' => config('mail.from.address'),
            'mail:from:name' => config('mail.from.name'),
            'has_password' => !empty(config('mail.mailers.smtp.password')),
        ], [
            'driver' => config('mail.default'),
            'disabled' => config('mail.default') !== 'smtp',
        ]);
    }

    /**
     * Handle request to update SMTP mail settings.
     *
     * @throws DisplayException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function updateMail(UpdateMailSettingsRequest $request): Response
    {
        if (config('mail.default') !== 'smtp') {
            throw new DisplayException('This feature is only available if SMTP is the selected email driver for the Panel.');
        }

        return $this->persist($request, function (array $values) {
            // The "!e" value is used to remove the currently stored password.
            if (array_get($values, 'mail:mailers:smtp:password') === '!e') {
                $values['mail:mailers:smtp:password'] = '';
            }

            return $values;
        });
    }

    /**
     * Submit a request to send a test mail message to the current user.
     *
     * @throws DisplayException
     */
    public function testMail(SendTestMailRequest $request): Response
    {
        try {
            Notification::route('mail', $request->user()->email)
                ->notify(new MailTested($request->user()));
        } catch (\Exception $exception) {
            throw new DisplayException($exception->getMessage(), $exception);
        }

        return $this->returnNoContent();
    }

    /**
     * Returns the advanced Panel settings. The reCAPTCHA secret key is never returned.
     */
    public function advanced(GetSettingsRequest $request): JsonResponse
    {
        $allocations = 'pterodactyl.client_features.allocations';

        return $this->respond([
            'recaptcha:enabled' => (bool) config('recaptcha.enabled'),
            'recaptcha:website_key' => config('recaptcha.website_key'),
            'has_recaptcha_secret_key' => !empty(config('recaptcha.secret_key')),
            'pterodactyl:guzzle:timeout' => (int) config('pterodactyl.guzzle.timeout'),
            'pterodactyl:guzzle:connect_timeout' => (int) config('pterodactyl.guzzle.connect_timeout'),
            'pterodactyl:client_features:allocations:enabled' => (bool) config("$allocations.enabled"),
            'pterodactyl:client_features:allocations:range_start' => $this->nullableInt(config("$allocations.range_start")),
            'pterodactyl:client_features:allocations:range_end' => $this->nullableInt(config("$allocations.range_end")),
        ], [
            'recaptcha_using_shipped_keys' => config('recaptcha._shipped_secret_key') === config('recaptcha.secret_key')
                || config('recaptcha._shipped_website_key') === config('recaptcha.website_key'),
        ]);
    }

    /**
     * Handle the advanced Panel settings being updated.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function updateAdvanced(UpdateAdvancedSettingsRequest $request): Response
    {
        return $this->persist($request);
    }

    /**
     * Stores the normalized settings from the request and restarts the queue
     * worker so that the changes are applied to it as well.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    private function persist(UpdateSettingsRequest $request, ?\Closure $callback = null): Response
    {
        $values = $request->normalize();
        if (!is_null($callback)) {
            $values = $callback($values);
        }

        foreach ($values as $key => $value) {
            if (in_array($key, SettingsServiceProvider::getEncryptedKeys()) && !empty($value)) {
                $value = $this->encrypter->encrypt($value);
            }

            $this->settings->set('settings::' . $key, is_null($value) ? null : (string) $value);
        }

        $this->kernel->call('queue:restart');

        return $this->returnNoContent();
    }

    /**
     * Returns the settings using the same structure as other API resources.
     */
    private function respond(array $attributes, array $meta = []): JsonResponse
    {
        return new JsonResponse([
            'object' => 'settings',
            'attributes' => $attributes,
            'meta' => array_merge($meta, [
                'environment_only' => (bool) config('pterodactyl.load_environment_only', false),
            ]),
        ]);
    }

    private function nullableInt(mixed $value): ?int
    {
        return is_null($value) || $value === '' ? null : (int) $value;
    }
}
