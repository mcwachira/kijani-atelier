<?php

namespace App\Services\Sms;

interface SmsProviderInterface
{
    /**
     * Send a transactional SMS.
     *
     * @param  string  $to  Recipient in international format (e.g. +254712345678).
     * @param  string  $text  Plain-text body, kept short by the caller.
     * @return string|null Provider-side message ID, if the provider returns one.
     *
     * @throws \App\Services\Sms\SmsException When the provider rejects the send.
     */
    public function sendSms(string $to, string $text): ?string;
}
