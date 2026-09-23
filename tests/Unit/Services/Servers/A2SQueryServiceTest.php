<?php

namespace Pterodactyl\Tests\Unit\Services\Servers;

use Pterodactyl\Tests\TestCase;
use Pterodactyl\Services\Servers\A2SQueryService;

class A2SQueryServiceTest extends TestCase
{
    private A2SQueryService $service;

    public function setUp(): void
    {
        parent::setUp();

        $this->service = new A2SQueryService();
    }

    public function testInfoPacketIsDecoded()
    {
        $result = $this->service->decode($this->packet('Valheim Server', 'MyWorld', 3, 10));

        $this->assertSame(['players' => 3, 'max_players' => 10], $result);
    }

    public function testEmptyAndFullServersAreDecoded()
    {
        $this->assertSame(0, $this->service->decode($this->packet('A', 'B', 0, 10))['players']);
        $this->assertSame(64, $this->service->decode($this->packet('A', 'B', 64, 64))['players']);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('malformedPacketProvider')]
    public function testMalformedPacketsAreRejected(string $packet)
    {
        $this->assertNull($this->service->decode($packet));
    }

    public static function malformedPacketProvider(): array
    {
        $packet = self::buildPacket('Valheim Server', 'MyWorld', 3, 10);

        return [
            'empty' => [''],
            'header only' => ["\xFF\xFF\xFF\xFF"],
            'split response' => ["\xFF\xFF\xFF\xFE" . substr($packet, 4)],
            'challenge response' => ["\xFF\xFF\xFF\xFFA\x01\x02\x03\x04"],
            'truncated mid string' => [substr($packet, 0, 12)],
            'truncated before counts' => [substr($packet, 0, 46)],
            'unterminated string' => ["\xFF\xFF\xFF\xFFI\x11Valheim Server"],
        ];
    }

    private function packet(string $name, string $map, int $players, int $max): string
    {
        return self::buildPacket($name, $map, $players, $max);
    }

    private static function buildPacket(string $name, string $map, int $players, int $max): string
    {
        return "\xFF\xFF\xFF\xFF"
            . 'I'
            . chr(17)
            . "$name\x00"
            . "$map\x00"
            . "valheim\x00"
            . "Valheim\x00"
            . pack('v', 892970 & 0xFFFF)
            . chr($players)
            . chr($max)
            . chr(0)
            . 'd'
            . 'l'
            . chr(0)
            . chr(1)
            . "1.0.0\x00";
    }
}
