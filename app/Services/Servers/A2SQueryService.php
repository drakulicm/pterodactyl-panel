<?php

namespace Pterodactyl\Services\Servers;

class A2SQueryService
{
    private const HEADER = "\xFF\xFF\xFF\xFF";
    private const REQUEST = self::HEADER . "TSource Engine Query\x00";

    private const TYPE_INFO = 0x49;
    private const TYPE_CHALLENGE = 0x41;

    /**
     * Ask a Steam game server for its current player count using A2S_INFO,
     * returning null when it cannot be reached or answers with nonsense.
     */
    public function query(string $host, int $port, float $timeout): ?array
    {
        $socket = @stream_socket_client(sprintf('udp://%s:%d', $host, $port), $code, $error, $timeout);

        if ($socket === false) {
            return null;
        }

        try {
            $response = $this->exchange($socket, self::REQUEST, $timeout);

            // Servers have been able to demand a challenge since the 2020 reflection
            // attack fixes, and answer the first request with one to be echoed back.
            if ($response !== null && ord($response[4]) === self::TYPE_CHALLENGE) {
                $response = $this->exchange($socket, self::REQUEST . substr($response, 5, 4), $timeout);
            }

            return $response === null ? null : $this->decode($response);
        } finally {
            fclose($socket);
        }
    }

    /**
     * Decode an A2S_INFO response packet. Split responses are not reassembled:
     * an info packet that large is not something a supported game sends.
     */
    public function decode(string $packet): ?array
    {
        if (strlen($packet) < 5 || !str_starts_with($packet, self::HEADER) || ord($packet[4]) !== self::TYPE_INFO) {
            return null;
        }

        $body = substr($packet, 5);
        $offset = 1;

        // Name, map, folder and game are only read to walk past them.
        foreach (range(1, 4) as $ignored) {
            if ($this->readString($body, $offset) === null) {
                return null;
            }
        }

        // Skip the Steam application id, which sits between the game name and the counts.
        $offset += 2;

        if (!isset($body[$offset], $body[$offset + 1])) {
            return null;
        }

        return [
            'players' => ord($body[$offset]),
            'max_players' => ord($body[$offset + 1]),
        ];
    }

    /**
     * Send a datagram and return the reply, or null if nothing usable came back.
     *
     * @param resource $socket
     */
    private function exchange($socket, string $request, float $timeout): ?string
    {
        stream_set_timeout($socket, (int) $timeout, (int) (fmod($timeout, 1) * 1_000_000));

        if (@fwrite($socket, $request) === false) {
            return null;
        }

        $response = @fread($socket, 4096);

        if (!is_string($response) || strlen($response) < 5 || !str_starts_with($response, self::HEADER)) {
            return null;
        }

        return $response;
    }

    /**
     * Read a null terminated string, advancing the offset past its terminator.
     */
    private function readString(string $body, int &$offset): ?string
    {
        if ($offset > strlen($body)) {
            return null;
        }

        $end = strpos($body, "\x00", $offset);

        if ($end === false) {
            return null;
        }

        $value = substr($body, $offset, $end - $offset);
        $offset = $end + 1;

        return $value;
    }
}
