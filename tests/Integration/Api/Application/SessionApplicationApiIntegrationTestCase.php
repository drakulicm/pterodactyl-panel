<?php

namespace Pterodactyl\Tests\Integration\Api\Application;

/**
 * Base test case for the application API endpoints that can only be accessed by an
 * administrator that is authenticated using their session, rather than an API key.
 */
abstract class SessionApplicationApiIntegrationTestCase extends ApplicationApiIntegrationTestCase
{
    /**
     * Drop the API key configured by the parent and authenticate using a session instead.
     */
    public function setUp(): void
    {
        parent::setUp();

        $this->withoutHeader('Authorization')->actingAs($this->getApiUser());
    }

    /**
     * Switches the test over to authenticating using the default application API key.
     */
    protected function usingApiKey(): self
    {
        $this->app['auth']->forgetGuards();
        $this->createNewDefaultApiKey($this->getApiUser());

        return $this;
    }
}
