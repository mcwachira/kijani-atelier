<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SMS provider
    |--------------------------------------------------------------------------
    |
    | Supported: "africastalking", "log". The log driver writes the message
    | to the Laravel log instead of sending anything — useful for local
    | development and for running the test suite without spending credit.
    |
    */
    'provider' => env('SMS_PROVIDER', 'log'),

    // Master switch. When false, SendContactMessageSms still runs (so the
    // queue/job path is exercised) but no provider call is made.
    'enabled' => env('SMS_ENABLED', false),

    // Business mobile number that receives contact-form notifications.
    // International format, e.g. +254712345678.
    'admin_phone' => env('SMS_ADMIN_PHONE'),

    // Send the customer a short confirmation as well. Off by default —
    // every extra SMS costs money and risks looking like spam.
    'customer_confirmation' => env('SMS_CUSTOMER_CONFIRMATION', false),

    'africastalking' => [
        'username' => env('AT_USERNAME', 'sandbox'),
        'api_key' => env('AT_API_KEY'),
        'sender_id' => env('AT_SENDER_ID'),
        'base_url' => env('AT_BASE_URL', 'https://api.africastalking.com/version1/messaging'),
    ],

];
