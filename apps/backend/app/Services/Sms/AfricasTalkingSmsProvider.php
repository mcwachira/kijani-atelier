<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Africa's Talking SMS driver.
 *
 * Chosen for transactional use because: sandbox environment for testing
 * without spending credit, delivery reports + sender IDs, REST API with
 * first-class PHP support, and direct Kenyan telco routes (Safaricom,
 * Airtel). Pricing at research time (Sept 2026, via public 2026 guides
 * and AT's own pricing pages): roughly KES 0.40–0.80 per local SMS —
 * NOT the cheapest in the market (bulk resellers go lower), but the
 * trade-off is API quality and deliverability for low-volume
 * transactional traffic, where a failed admin notification costs far
 * more than a few cents saved per SMS.
 */
class AfricasTalkingSmsProvider implements SmsProviderInterface
{
    public function sendSms(string $to, string $text): ?string
    {
        $to = self::normalize($to);
        $username = config('sms.africastalking.username');
        $apiKey = config('sms.africastalking.api_key');
        $senderId = config('sms.africastalking.sender_id');

        if (! $apiKey) {
            throw new SmsException('Africa\'s Talking API key is not configured (AT_API_KEY).');
        }

        $payload = [
            'username' => $username,
            'to' => $to,
            'message' => $text,
        ];

        if ($senderId) {
            $payload['from'] = $senderId;
        }

        $response = Http::asForm()
            ->withHeaders(['apiKey' => $apiKey, 'Accept' => 'application/json'])
            ->timeout(15)
            ->post(config('sms.africastalking.base_url'), $payload);

        if (! $response->successful()) {
            Log::warning('Africa\'s Talking SMS send failed', [
                'to' => $to,
                'status' => $response->status(),
            ]);

            throw new SmsException('Africa\'s Talking rejected the SMS request (HTTP ' . $response->status() . ').');
        }

        $recipients = $response->json('SMSMessageData.Recipients', []);

        if (($recipients[0]['status'] ?? '') !== 'Success') {
            Log::warning('Africa\'s Talking SMS not accepted', [
                'to' => $to,
                'response' => $recipients[0] ?? null,
            ]);

            throw new SmsException('Africa\'s Talking did not accept the SMS: ' . ($recipients[0]['status'] ?? 'unknown'));
        }

        return $recipients[0]['messageId'] ?? null;
    }

    /**
     * Normalize to E.164-style international format.
     *
     * Rules (Kenya-focused, international-safe):
     * - formatting characters (spaces, hyphens, parens, dots) are stripped
     * - a leading 00 international prefix becomes +
     * - Kenyan local numbers (0 + 9 digits) become +254…
     * - Kenyan numbers already starting with 254 become +254…
     * - numbers already starting with + keep their country code
     * - anything else (empty, non-numeric, wrong length, bare national
     *   numbers we can't attribute to a country) throws instead of
     *   producing a plausible-looking but wrong number
     *
     * @throws SmsException When the input is not a recognizable number.
     */
    public static function normalize(string $phone): string
    {
        $cleaned = trim($phone);

        if ($cleaned === '') {
            throw new SmsException('Phone number is empty.');
        }

        // Strip common formatting; a '+' is only meaningful leading.
        $cleaned = preg_replace('/[\s\-().\/]/', '', $cleaned) ?? '';

        if (! preg_match('/^\+?\d+$/', $cleaned)) {
            throw new SmsException("Phone number '{$phone}' is not a valid number.");
        }

        if (str_starts_with($cleaned, '00')) {
            $cleaned = '+' . substr($cleaned, 2);
        }

        if (str_starts_with($cleaned, '+')) {
            $digits = strlen($cleaned) - 1;

            if ($digits < 7 || $digits > 15) {
                throw new SmsException("Phone number '{$phone}' has an invalid length.");
            }

            return $cleaned;
        }

        // Kenyan local format: 0712… (10 digits).
        if (preg_match('/^0\d{9}$/', $cleaned)) {
            return '+254' . substr($cleaned, 1);
        }

        // Kenyan number without the +: 254712….
        if (preg_match('/^254\d{9}$/', $cleaned)) {
            return '+' . $cleaned;
        }

        throw new SmsException("Phone number '{$phone}' needs a country code (e.g. +254712345678).");
    }
}
