<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Fail-fast validation for the SMS configuration.
 *
 * Called once from AppServiceProvider::boot() so a misconfiguration is
 * detected at boot/deploy time instead of surfacing later as a silently
 * skipped (or failing) queued job. When SMS is disabled, anything goes —
 * local development and the test suite must work with no SMS env at all.
 */
final class SmsConfigValidator
{
    public const PROVIDERS = ['log', 'africastalking'];

    /**
     * @param  array<string, mixed>  $config  The `sms` config array.
     *
     * @throws RuntimeException When SMS is enabled but misconfigured.
     */
    public static function validate(array $config): void
    {
        // env() values can arrive as strings ("true"/"1"); normalize so
        // the conditional rules below behave the same in tests (which
        // pass raw arrays) as they do from real environment variables.
        $enabled = filter_var($config['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $provider = $config['provider'] ?? null;

        $validator = Validator::make($config, [
            'provider' => ['required', 'string', Rule::in(self::PROVIDERS)],
            'enabled' => ['boolean'],
            // Required whenever notifications are switched on, whatever
            // the driver — without a recipient there is nothing to send to.
            'admin_phone' => [
                Rule::requiredIf($enabled),
                'nullable',
                'string',
                'regex:/^\+?[0-9][0-9\s\-()]{5,19}$/',
            ],
            // Only the live driver needs credentials; the log driver and
            // a disabled setup must never demand an API key. Username and
            // base URL both ship usable defaults in config/sms.php.
            'africastalking.api_key' => [
                Rule::requiredIf($enabled && $provider === 'africastalking'),
                'nullable',
                'string',
            ],
        ]);

        if ($validator->fails()) {
            throw new RuntimeException(
                'Invalid SMS configuration: ' . $validator->errors()->first()
            );
        }
    }
}
