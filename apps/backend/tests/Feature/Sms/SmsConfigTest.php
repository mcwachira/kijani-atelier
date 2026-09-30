<?php

use App\Services\Sms\SmsConfigValidator;

function validSmsConfig(): array
{
    return [
        'provider' => 'africastalking',
        'enabled' => true,
        'admin_phone' => '+254700000000',
        'customer_confirmation' => false,
        'africastalking' => [
            'username' => 'sandbox',
            'api_key' => 'test-key',
            'sender_id' => null,
            'base_url' => 'https://api.africastalking.com/version1/messaging',
        ],
    ];
}

it('accepts a valid production configuration', function () {
    SmsConfigValidator::validate(validSmsConfig());

    expect(true)->toBeTrue();
});

it('works with SMS disabled and no admin phone or credentials', function () {
    // The local-dev / test-suite shape: nothing SMS-related configured.
    SmsConfigValidator::validate([
        'provider' => 'log',
        'enabled' => false,
        'admin_phone' => null,
        'africastalking' => ['api_key' => null],
    ]);

    expect(true)->toBeTrue();
});

it('does not require Africa\'s Talking credentials when SMS is disabled', function () {
    $config = validSmsConfig();
    $config['enabled'] = false;
    $config['admin_phone'] = null;
    $config['africastalking']['api_key'] = null;

    SmsConfigValidator::validate($config);

    expect(true)->toBeTrue();
});

it('rejects SMS enabled with a missing admin phone', function () {
    $config = validSmsConfig();
    $config['admin_phone'] = null;

    expect(fn () => SmsConfigValidator::validate($config))->toThrow(RuntimeException::class);
});

it('rejects an unsupported provider', function () {
    $config = validSmsConfig();
    $config['provider'] = 'twilio';

    expect(fn () => SmsConfigValidator::validate($config))->toThrow(RuntimeException::class);
});

it('rejects Africa\'s Talking enabled without an API key', function () {
    $config = validSmsConfig();
    $config['africastalking']['api_key'] = null;

    expect(fn () => SmsConfigValidator::validate($config))->toThrow(RuntimeException::class);
});

it('rejects a malformed admin phone even when everything else is set', function () {
    $config = validSmsConfig();
    $config['admin_phone'] = 'not-a-phone';

    expect(fn () => SmsConfigValidator::validate($config))->toThrow(RuntimeException::class);
});
