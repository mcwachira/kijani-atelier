<?php

namespace App\Services\Paystack;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    private string $baseUrl = 'https://api.paystack.co';

    private readonly string $secretKey;

    public function __construct(?string $secretKey = null)
    {
        // Compute the final value FIRST, then assign it ONCE — readonly
        // properties can only be written a single time, so we can't
        // assign a placeholder in the property promotion and then
        // conditionally overwrite it afterward the way a normal
        // property would allow.
        $this->secretKey = $secretKey ?? config('services.paystack.secret');
    }

    /**
     * Starts a transaction. Returns a hosted checkout URL — the frontend
     * redirects the customer there to enter card details. Paystack hosts
     * the actual card form, so raw card data never touches your backend
     * (required for PCI compif ($this->secretKey === '') {
     * $this->secretKey = config('services.paystack.secret');
     * }liance).
     */
    public function initialize(string $email, int $amountInSmallestUnit, string $reference, string $callbackUrl, array $metadata = []): array
    {
        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/transaction/initiate", [
                'email' => $email,
                'amount' => $amountInSmallestUnit,
                'currency' => 'KES',
                'callback_url' => $callbackUrl,
                'reference' => $reference,
                'metadata' => $metadata,
            ]);

        if (! $response->successful() || ! $response->json('status')) {
            Log::error('Paystack initialize failed', ['response' => $response->json()]);
            throw new \RuntimeException($response->json('message', 'Paystack request failed.'));
        }

        return $response->json('data');
    }

    /**
     * Confirms a transaction's real status directly from Paystack — used
     * both as a webhook companion and as a fallback when the customer
     * returns from checkout before the async webhook has arrived.
     */
    public function verify(string $reference): array
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        if (! $response->successful()) {
            Log::error('Paystack verify failed', ['response' => $response->json()]);
            throw new \RuntimeException($response->json('message', 'Could not verify payment.'));
        }

        return $response->json('data');
    }

    /**
     * Verifies a webhook's HMAC-SHA512 signature against your secret key.
     * THIS is what proves a webhook genuinely came from Paystack —
     * skipping it means anyone who finds your webhook URL can forge a
     * "payment succeeded" event.
     *
     * hash_equals (NOT ===) — a plain string comparison here would be
     * vulnerable to a timing attack that can leak the correct signature
     * one byte at a time; hash_equals runs in constant time regardless
     * of how much of the string matches.
     */
    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (! $signatureHeader) {
            return false;
        }

        $computed = hash_hmac('sha512', $rawBody, $this->secretKey);

        return hash_equals($computed, $signatureHeader);
    }
}
