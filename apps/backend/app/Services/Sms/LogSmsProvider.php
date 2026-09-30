<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/**
 * No-op driver for local dev and tests: records the SMS in the log
 * instead of calling a provider. Never used when SMS_ENABLED is true
 * with a real provider configured — see AppServiceProvider binding.
 */
class LogSmsProvider implements SmsProviderInterface
{
    public function sendSms(string $to, string $text): ?string
    {
        Log::info('SMS (log driver — not sent)', ['to' => $to, 'text' => $text]);

        return null;
    }
}
