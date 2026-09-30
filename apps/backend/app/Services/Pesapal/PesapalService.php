<?php

namespace App\Services\Pesapal;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PesapalException extends \RuntimeException
{
}

class PesapalService
{
    // GetTransactionStatus status codes — the ONLY vocabulary that
    // decides whether money actually moved.
    public const STATUS_COMPLETED = 1;

    public function __construct(
        private readonly ?string $consumerKey = null,
        private readonly ?string $consumerSecret = null,
    ) {
    }

    private function key(): string
    {
        $key = $this->consumerKey ?? config('pesapal.consumer_key');

        if (! $key) {
            throw new PesapalException('Pesapal credentials are not configured (PESAPAL_CONSUMER_KEY).');
        }

        return $key;
    }

    private function secret(): string
    {
        $secret = $this->consumerSecret ?? config('pesapal.consumer_secret');

        if (! $secret) {
            throw new PesapalException('Pesapal credentials are not configured (PESAPAL_CONSUMER_SECRET).');
        }

        return $secret;
    }

    private function baseUrl(): string
    {
        return config('pesapal.base_url');
    }

    /**
     * Bearer token, cached until just before Pesapal's own expiry.
     * Auth failures are never cached — a bad-credentials response must
     * not poison the cache for the next retry with fixed keys.
     */
    public function token(): string
    {
        return Cache::remember('pesapal_token', now()->addMinutes(4), function () {
            $response = Http::acceptJson()->post("{$this->baseUrl()}/Auth/RequestToken", [
                'consumer_key' => $this->key(),
                'consumer_secret' => $this->secret(),
            ]);

            if (! $response->successful() || ! $response->json('token')) {
                Log::warning('Pesapal auth failed', ['status' => $response->status()]);
                throw new PesapalException('Pesapal authentication failed.');
            }

            return $response->json('token');
        });
    }

    /**
     * One-time setup helper: registers a public IPN endpoint and returns
     * its notification_id. Run via `pesapal:register-ipn`, persist the
     * ID in PESAPAL_IPN_ID — never call this per order.
     */
    public function registerIpn(string $url, string $type = 'POST'): array
    {
        $response = Http::withToken($this->token())->acceptJson()->post("{$this->baseUrl()}/URLSetup/RegisterIPN", [
            'url' => $url,
            'ipn_notification_type' => $type,
        ]);

        if (! $response->successful()) {
            throw new PesapalException('Pesapal IPN registration failed.');
        }

        return $response->json();
    }

    /**
     * Submits an order and returns order_tracking_id + redirect_url.
     * The customer pays on Pesapal's hosted page — no card data here.
     */
    public function submitOrder(
        string $merchantReference,
        int $amount,
        string $currency,
        string $description,
        string $callbackUrl,
        string $email,
        ?string $phone = null,
        ?string $firstName = null,
        ?string $lastName = null,
    ): array {
        $ipnId = config('pesapal.ipn_id');

        if (! $ipnId) {
            throw new PesapalException('Pesapal IPN is not registered (PESAPAL_IPN_ID).');
        }

        $response = Http::withToken($this->token())->acceptJson()->post(
            "{$this->baseUrl()}/Transactions/SubmitOrderRequest",
            [
                'id' => $merchantReference,
                'currency' => $currency,
                'amount' => $amount,
                'description' => $description,
                'callback_url' => $callbackUrl,
                'notification_id' => $ipnId,
                'billing_address' => array_filter([
                    'email_address' => $email,
                    'phone_number' => $phone,
                    'country_code' => 'KE',
                    'first_name' => $firstName ?? $email,
                    'last_name' => $lastName ?? '',
                ]),
            ]
        );

        if (! $response->successful() || ! $response->json('order_tracking_id')) {
            Log::warning('Pesapal SubmitOrder failed', ['response' => $response->json()]);
            throw new PesapalException($response->json('error.message', 'Pesapal order submission failed.'));
        }

        return $response->json();
    }

    /**
     * Authoritative status for an order_tracking_id. COMPLETED (1) is the
     * only success — FAILED (2), REVERSED (3) and INVALID (0) all mean
     * no money moved.
     */
    public function getTransactionStatus(string $orderTrackingId): array
    {
        $response = Http::withToken($this->token())->acceptJson()->get(
            "{$this->baseUrl()}/Transactions/GetTransactionStatus",
            ['orderTrackingId' => $orderTrackingId]
        );

        if (! $response->successful()) {
            throw new PesapalException('Pesapal status check failed.');
        }

        return $response->json();
    }
}
