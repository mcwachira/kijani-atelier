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
     * Normalize to international format: strip separators, convert a
     * leading Kenyan 0 (0712…) to +254712….
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/[^\d+]/', '', $phone) ?? '';

        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '+254' . substr($digits, 1);
        }

        return str_starts_with($digits, '+') ? $digits : '+' . $digits;
    }
}
