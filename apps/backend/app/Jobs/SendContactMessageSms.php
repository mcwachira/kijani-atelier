<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\Sms\SmsProviderInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Notify the business about a new contact-form message by SMS.
 *
 * Runs on the queue — the HTTP request that saved the message never
 * waits for the provider. Retries 3 times with backoff; a failed SMS
 * never affects the already-saved message.
 *
 * The text deliberately contains only the sender's name and a subject
 * excerpt — no email addresses, no message body, and never anything
 * credential-like.
 */
class SendContactMessageSms implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function __construct(public int $messageId)
    {
    }

    public function handle(SmsProviderInterface $sms): void
    {
        if (! config('sms.enabled')) {
            return;
        }

        $adminPhone = config('sms.admin_phone');

        if (! $adminPhone) {
            Log::warning('SendContactMessageSms skipped — SMS_ADMIN_PHONE is not configured.');

            return;
        }

        $message = Message::find($this->messageId);

        if (! $message) {
            return;
        }

        $subject = Str::limit($message->subject, 60);

        $sms->sendSms(
            $adminPhone,
            "Kijani Atelier: new message from {$message->name} — “{$subject}”. Reply in admin inbox."
        );

        if (config('sms.customer_confirmation') && $message->phone) {
            $sms->sendSms(
                $message->phone,
                'Kijani Atelier: thanks, we received your message and reply within a day.'
            );
        }
    }
}
