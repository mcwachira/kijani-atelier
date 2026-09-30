<?php

use App\Jobs\SendContactMessageSms;
use App\Models\Message;
use App\Services\Sms\AfricasTalkingSmsProvider;
use App\Services\Sms\SmsException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

it('sends the admin SMS through the provider when enabled', function () {
    config(['sms.enabled' => true, 'sms.admin_phone' => '+254700000000', 'sms.africastalking.api_key' => 'test-key']);
    Http::fake([
        '*' => Http::response([
            'SMSMessageData' => [
                'Recipients' => [['status' => 'Success', 'messageId' => 'AT-123']],
            ],
        ], 200),
    ]);

    $message = Message::factory()->create(['name' => 'Wanjiru', 'subject' => 'Sizing question']);

    (new SendContactMessageSms($message->id))->handle(app(AfricasTalkingSmsProvider::class));

    Http::assertSent(fn ($request) => $request['to'] === '+254700000000');
});

it('throws when the provider rejects the SMS', function () {
    config(['sms.enabled' => true, 'sms.admin_phone' => '+254700000000', 'sms.africastalking.api_key' => 'test-key']);
    Http::fake(['*' => Http::response(['SMSMessageData' => ['Message' => 'Invalid']], 400)]);

    $message = Message::factory()->create();

    expect(fn () => (new SendContactMessageSms($message->id))->handle(app(AfricasTalkingSmsProvider::class)))
        ->toThrow(SmsException::class);
});

it('does nothing when SMS is disabled', function () {
    config(['sms.enabled' => false]);
    Http::fake();

    $message = Message::factory()->create();

    (new SendContactMessageSms($message->id))->handle(app(AfricasTalkingSmsProvider::class));

    Http::assertNothingSent();
});

it('does not run the job inline during message submission', function () {
    Queue::fake();
    config(['sms.enabled' => true]);

    $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'phone' => '+254712345678',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
    ])->assertStatus(201);

    // Queued, not synchronous — the HTTP request never waits for the provider.
    Queue::assertPushed(SendContactMessageSms::class, 1);
});

it('normalizes Kenyan and international numbers without guessing', function () {
    // Kenyan local and zero-stripped forms
    expect(AfricasTalkingSmsProvider::normalize('0712345678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('0712 345 678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('(0712) 345-678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('254712345678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('+254712345678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('+254 712 345 678'))->toBe('+254712345678')
        ->and(AfricasTalkingSmsProvider::normalize('00254712345678'))->toBe('+254712345678')
        // Other country codes are preserved, never rewritten to +254.
        // A syntactically valid but unknown country code (+999) is passed
        // through as-is: shape validation is ours, deliverability is the
        // provider's job to report at send time.
        ->and(AfricasTalkingSmsProvider::normalize('+2348012345678'))->toBe('+2348012345678')
        ->and(AfricasTalkingSmsProvider::normalize('+27712345678'))->toBe('+27712345678')
        ->and(AfricasTalkingSmsProvider::normalize('+9991234567'))->toBe('+9991234567');
});

it('rejects empty, non-numeric, and unattributable numbers instead of guessing', function () {
    foreach (['', '   ', 'abc', 'not-a-phone', '+', '123', '071234567', '07123456789', '712345678', '+25471234567890123456', '++254712345678'] as $bad) {
        expect(fn () => AfricasTalkingSmsProvider::normalize($bad))->toThrow(SmsException::class);
    }
});

it('sends with the normalized admin number', function () {
    config([
        'sms.enabled' => true,
        'sms.admin_phone' => '0700000000',
        'sms.africastalking.api_key' => 'test-key',
    ]);
    Http::fake([
        '*' => Http::response([
            'SMSMessageData' => [
                'Recipients' => [['status' => 'Success', 'messageId' => 'AT-1']],
            ],
        ], 200),
    ]);

    $message = Message::factory()->create(['name' => 'Wanjiru', 'subject' => 'Sizing question']);

    (new SendContactMessageSms($message->id))->handle(app(AfricasTalkingSmsProvider::class));

    // Local admin number arrives at the provider in international format.
    Http::assertSent(fn ($request) => $request['to'] === '+254700000000');
});
