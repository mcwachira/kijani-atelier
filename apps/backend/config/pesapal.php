<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pesapal (card payments)
    |--------------------------------------------------------------------------
    |
    | Pesapal hosts the entire card form — raw PAN/CVV/expiry never touch
    | this backend (PCI scope stays minimal). Flow: submit order →
    | redirect customer to Pesapal → IPN + customer callback → we fetch
    | the authoritative status via GetTransactionStatus (the callback/IPN
    | themselves carry NO payment status, by Pesapal's design).
    |
    */
    'env' => env('PESAPAL_ENV', 'sandbox'),

    'consumer_key' => env('PESAPAL_CONSUMER_KEY'),
    'consumer_secret' => env('PESAPAL_CONSUMER_SECRET'),

    // notification_id from a one-time RegisterIPN call for this
    // environment's public IPN endpoint. Register once per environment
    // (see `pesapal:register-ipn`), then persist the ID here — never
    // re-register per order.
    'ipn_id' => env('PESAPAL_IPN_ID'),

    // Frontend page Pesapal redirects the customer to after payment.
    'callback_url' => env('PESAPAL_CALLBACK_URL', 'http://localhost:3000/checkout/success'),

    'base_url' => env('PESAPAL_ENV', 'sandbox') === 'live'
        ? 'https://pay.pesapal.com/v3/api'
        : 'https://cybqa.pesapal.com/pesapalv3/api',

];
