<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pending-order reservation TTL (minutes)
    |--------------------------------------------------------------------------
    |
    | Checkout decrements stock immediately inside the order transaction,
    | so a pending order is effectively a stock reservation. If the
    | customer never pays (abandoned M-Pesa prompt, closed Pesapal tab),
    | the orders:expire-stale command cancels the order and releases the
    | stock after this many minutes. Tune via ORDER_PENDING_TTL_MINUTES.
    |
    */
    'pending_ttl_minutes' => env('ORDER_PENDING_TTL_MINUTES', 120),

];
