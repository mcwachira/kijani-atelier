<?php

return [
    'env' => env('MPESA_ENV', 'sandbox'),

    'base_url' => env('MPESA_ENV') === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke',

    'consumer_key' => env('MPESA_CONSUMER_KEY'),
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),
    'shortcode' => env('MPESA_SHORTCODE'),
    'passkey' => env('MPESA_PASSKEY'),

    'callback_url' => env('MPESA_CALLBACK_URL'),

    // Restrict callback processing to Safaricom's published IP ranges.
    // Defaults to FALSE — local/sandbox testing receives callbacks via
    // ngrok from your own machine, not Safaricom's real infrastructure,
    // so this must stay off unless explicitly enabled (production only).
    'verify_callback_ip' => env('MPESA_VERIFY_CALLBACK_IP', false),
    'allowed_callback_ips' => [
        '196.201.214.200', '196.201.214.206', '196.201.213.114',
        '196.201.214.207', '196.201.214.208', '196.201.213.44',
        '196.201.212.127', '196.201.212.138', '196.201.212.129',
        '196.201.212.136', '196.201.212.74', '196.201.212.69',
    ],
];
