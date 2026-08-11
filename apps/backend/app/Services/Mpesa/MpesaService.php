<?php

namespace App\Services\Mpesa;

use App\Models\Payment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MpesaService
{
    private string $baseUrl;

    public function __construct()
{
    $this->baseUrl = config('mpesa.base_url');
}

    /**
     * Safaricom's OAuth token is valid for ~1 hour. Caching it means we
     * only actually call the auth endpoint roughly once an hour, not on
     * every single checkout — Safaricom's sandbox in particular rate-
     * limits this endpoint aggressively.
     */
    public function getAccessToken():string
    {
        return Cache::remember('mpesa_access_token', now()->addMinutes(55), function () {

            $response = Http::withBasicAuth(
                config('mpesa.consumer_key'),
                config('mpesa.consumer_secret')
            )->get("{$this->baseUrl}/oauth/v1/generate", ['grant_type' => 'client_credentials']);

            if(! $response -> successful()) {
                Log::error('Failed to get access token from M-Pesa', [
                    'response' => $response->body(),
                ]);
                throw new \RuntimeException('Could not authenticated with M-pesa');
            }

            return $response->json('access_token');
        });
    }


    /**
     * Initiates an STK Push — the prompt that appears on the customer's
     * phone asking them to enter their M-Pesa PIN. Returns Safaricom's
     * CheckoutRequestID, which we store and later match against the
     * async callback to know which payment actually completed.
     */


    public function stkPush(string $phone , int $amount , string $accountReference, string $description):array

    {
        $timestamp = now()->format('YmdHis');
        $password = base64_encode(config('mpesa.shortcode').config('mpesa.passkey').$timestamp);

        $response = Http::withToken($this -> getAccessToken())
            ->post("{$this->baseUrl}/mpesa/stkpush/v1/processrequest", [
                'BusinessShortCode' => config('mpesa.shortcode'),
                'Password' => $password,
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => $amount,
                'PartyA' => $this->normalizePhone($phone), // was: $phone (unnormalized)
                'PartyB' => config('mpesa.shortcode'),
                'PhoneNumber' => $this->normalizePhone($phone),
                'CallBackURL' => config('mpesa.callback_url'),
                'AccountReference' => $accountReference,
                'TransactionDesc' => $description,
            ]);
        if(! $response ->successful() || $response -> json('ResponseCode') !== "0") {
            Log::error('Failed to initiate M-Pesa STK Push', ['response' => $response->json()]);
            throw  new \RuntimeException($response -> json('errorMessage', 'M-pesa request failed.'));
        }

        return $response->json();
    }


    /**
     * M-Pesa requires phone numbers in 2547XXXXXXXX format — normalizes
     * the common variants a customer might actually type (07..., +254...).
     */
    private function normalizePhone(string $phone):string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if(str_starts_with($digits, '0')) {
            return '254' . substr($digits, 1);
        }
        if(str_starts_with($digits, '254')) {
            return $digits;
        }
        if(str_starts_with($digits, '7') || str_starts_with($digits, '1')) {
            return '254' .  $digits;
        }

        return  $digits;
    }

}
