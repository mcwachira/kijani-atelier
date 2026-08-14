<?php

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;

it('initiates an STK push for a valid order', function () {
    // Fakes BOTH calls the flow makes: the OAuth token request, then the
    // actual STK push. Real Safaricom is never contacted during tests.
    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'fake-token'], 200),
        '*stkpush/v1/processrequest' => Http::response([
            'MerchantRequestID' => 'merchant-1',
            'CheckoutRequestID' => 'ws_CO_test123',
            'ResponseCode' => '0',
            'ResponseDescription' => 'Success',
            'CustomerMessage' => 'Check your phone',
        ], 200),
    ]);

    $order = Order::factory()->create();
    $order->forceFill(['total' => 6800])->save();

    $response = $this->postJson('/api/v1/payments/mpesa/initiate', [
        'order_reference' => $order->reference,
        'phone' => '0712345678',
    ]);

    $response->assertStatus(202);

    // status isn't in Payment::$fillable, but it defaults to 'pending' at
    // the database level (see the migration), so assertDatabaseHas can
    // still check it directly here — no forceFill needed for a plain
    // assertion against what's already in the row.
    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'method' => 'mpesa',
        'checkout_request_id' => 'ws_CO_test123',
        'status' => 'pending',
    ]);

    // Confirms the phone number was normalized correctly (0712... → 254712...)
    // on BOTH PartyA and PhoneNumber — and that the AMOUNT sent to
    // Safaricom is the order's real server-side total, never anything the
    // client could have supplied.
    Http::assertSent(function ($request) use ($order) {
        return str_contains($request->url(), 'processrequest')
            && $request['PartyA'] === '254712345678'
            && $request['PhoneNumber'] === '254712345678'
            && $request['Amount'] === $order->total;
    });
});

it('rejects an STK push for a nonexistent order reference', function () {
    $this->postJson('/api/v1/payments/mpesa/initiate', [
        'order_reference' => 'KJ-DOESNOTEXIST',
        'phone' => '0712345678',
    ])->assertStatus(422)->assertJsonValidationErrors('order_reference');
});

it('rejects a malformed phone number', function () {
    $order = Order::factory()->create();

    $this->postJson('/api/v1/payments/mpesa/initiate', [
        'order_reference' => $order->reference,
        'phone' => '12345',
    ])->assertStatus(422)->assertJsonValidationErrors('phone');
});

it('marks a payment completed and the order paid on a successful callback', function () {
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();

    // status/checkout_request_id: checkout_request_id IS fillable, so it
    // stays in create(). status is NOT fillable — set separately via
    // forceFill, since create() would otherwise silently ignore it and
    // leave the row at whatever the migration's default is.
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'mpesa',
        'checkout_request_id' => 'ws_CO_success1',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $callbackPayload = [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'ws_CO_success1',
                'ResultCode' => 0,
                'ResultDesc' => 'Success',
                'CallbackMetadata' => [
                    'Item' => [
                        ['Name' => 'Amount', 'Value' => $order->total],
                        ['Name' => 'MpesaReceiptNumber', 'Value' => 'QGH7XCLMN9'],
                        ['Name' => 'PhoneNumber', 'Value' => 254712345678],
                    ],
                ],
            ],
        ],
    ];

    $response = $this->postJson('/api/v1/payments/mpesa/callback', $callbackPayload);

    $response->assertStatus(200);
    expect($payment->fresh()->status)->toBe('completed');
    expect($payment->fresh()->provider_reference)->toBe('QGH7XCLMN9');
    expect($order->fresh()->status)->toBe('paid');

    $this->assertDatabaseHas('order_status_events', [
        'order_id' => $order->id,
        'from_status' => 'pending',
        'to_status' => 'paid',
    ]);
});

it('marks a payment failed on a failed callback, without touching the order status', function () {
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();

    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'checkout_request_id' => 'ws_CO_fail1',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $callbackPayload = [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'ws_CO_fail1',
                'ResultCode' => 1032, // Safaricom's "cancelled by user" code
                'ResultDesc' => 'Request cancelled by user',
            ],
        ],
    ];

    $this->postJson('/api/v1/payments/mpesa/callback', $callbackPayload)
        ->assertStatus(200);

    expect($payment->fresh()->status)->toBe('failed');
    // Order stays pending — a failed payment attempt doesn't mark the
    // order paid, and shouldn't silently cancel it either (the customer
    // may retry).
    expect($order->fresh()->status)->toBe('pending');
});

it('is idempotent — processing the same callback twice only applies it once', function () {
    $order = Order::factory()->create();

    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'checkout_request_id' => 'ws_CO_dup1',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $callbackPayload = [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'ws_CO_dup1',
                'ResultCode' => 0,
                'CallbackMetadata' => [
                    'Item' => [
                        ['Name' => 'Amount', 'Value' => 1000],
                        ['Name' => 'MpesaReceiptNumber', 'Value' => 'DUPTEST1'],
                    ],
                ],
            ],
        ],
    ];

    // Send the identical callback TWICE — Safaricom is known to
    // occasionally deliver duplicates.
    $this->postJson('/api/v1/payments/mpesa/callback', $callbackPayload);
    $this->postJson('/api/v1/payments/mpesa/callback', $callbackPayload);

    // Only ONE order_status_event should exist — proves the second
    // callback was correctly ignored because payment->status was no
    // longer 'pending' by the time it arrived.
    expect(\App\Models\OrderStatusEvent::where('order_id', $order->id)->count())->toBe(1);
});

it('gracefully ignores a callback for an unknown checkout_request_id', function () {
    $callbackPayload = [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'ws_CO_never_existed',
                'ResultCode' => 0,
            ],
        ],
    ];

    // Should NOT error, even though no matching Payment row exists —
    // this can legitimately happen with stale sandbox test callbacks.
    $this->postJson('/api/v1/payments/mpesa/callback', $callbackPayload)
        ->assertStatus(200);
});

it('reports payment and order status via the polling endpoint', function () {
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'paid'])->save();

    $payment = Payment::factory()->create(['order_id' => $order->id]);
    $payment->forceFill(['status' => 'completed'])->save();

    $this->getJson("/api/v1/payments/{$payment->id}/status")
        ->assertStatus(200)
        ->assertJson(['status' => 'completed', 'order_status' => 'paid']);
});


it('accepts a callback from an allowlisted IP when verification is enabled', function () {
    config(['mpesa.verify_callback_ip' => true, 'mpesa.allowed_callback_ips' => ['127.0.0.1']]);

    $order = Order::factory()->create();
    $payment = Payment::factory()->create(['order_id' => $order->id, 'checkout_request_id' => 'ws_CO_ip_ok']);
    $payment->forceFill(['status' => 'pending'])->save();

    $this->postJson('/api/v1/payments/mpesa/callback', [
        'Body' => ['stkCallback' => ['CheckoutRequestID' => 'ws_CO_ip_ok', 'ResultCode' => 0]],
    ])->assertStatus(200); // Pest's test client requests from 127.0.0.1 by default
});


it('rejects a callback from a non-allowlisted IP when verification is enabled', function () {
    config(['mpesa.verify_callback_ip' => true, 'mpesa.allowed_callback_ips' => ['196.201.214.200']]);

    $this->postJson('/api/v1/payments/mpesa/callback', [
        'Body' => ['stkCallback' => ['CheckoutRequestID' => 'anything', 'ResultCode' => 0]],
    ])->assertStatus(403);
});
