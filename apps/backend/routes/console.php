<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Release stock reserved by orders whose payment never completed.
// The TTL itself lives in config/orders.php (ORDER_PENDING_TTL_MINUTES).
Schedule::command('orders:expire-stale')->everyThirtyMinutes();
Schedule::command('payments:reconcile')->everyFiveMinutes();
