<?php

namespace App\Console\Commands;

use App\Services\Pesapal\PesapalService;
use Illuminate\Console\Command;

/**
 * One-time setup per environment: registers this environment's public
 * IPN endpoint with Pesapal and prints the notification_id to persist
 * as PESAPAL_IPN_ID. Run once for sandbox, once for live — never per
 * order, never on every deploy.
 */
class RegisterPesapalIpn extends Command
{
    protected $signature = 'pesapal:register-ipn {url} {--type=POST}';

    protected $description = 'Register a Pesapal IPN endpoint and print its notification ID.';

    public function handle(PesapalService $pesapal): int
    {
        $result = $pesapal->registerIpn($this->argument('url'), $this->option('type'));

        $this->info('IPN registered. Persist this ID as PESAPAL_IPN_ID:');
        $this->line($result['ipn_id'] ?? json_encode($result));

        return self::SUCCESS;
    }
}
