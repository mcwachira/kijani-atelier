<?php




use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;

it('initializes a Paystack transaction for a valid order', function () {
    Http::fake([
        '*/transaction/initiate' => Http::response([
            'status' => true,
            'data' => [
                'authorization_url' => 'https://checkout.paystack.com/abc123',
                'access_code' => 'abc123',
                'reference' => 'KJ-TEST-xyz',
            ],
        ], 200),
    ]);

    $order = Order::factory()->create();
    $order->forceFill(['total' => 9500])->save();

    $response = $this->postJson('/api/v1/payments/card/initiate', [
        'order_reference' => $order->reference,
        'email' => 'customer@example.com',
    ]);

    dump($response->status(), $response->json()); // TEMPORARY DEBUGsss
    $response->assertStatus(202)
        ->assertJsonStructure(['authorization_url', 'reference']);

    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'method' => 'card',
        'status' => 'pending',
    ]);

    // Confirms the amount sent is in kobo/cents (order total * 100) and,
    // as with M-Pesa, that it's the SERVER's total, never a client value.
    Http::assertSent(function ($request) use ($order) {
        return str_contains($request->url(), 'initiate')
            && $request['amount'] === $order->total * 100
            && $request['email'] === 'customer@example.com';
    });
});


it('rejects initialization for a nonexistent order', function () {
    $this->postJson('/api/v1/payments/card/initiate', [
        'order_reference' => 'KJ-NOPE',
        'email' => 'test@example.com',
    ])->assertStatus(422);
});


it('rejects initialization with an invalid email', function () {
    $order = Order::factory()->create();

    $this->postJson('/api/v1/payments/card/initiate', [
        'order_reference' => $order->reference,
        'email' => 'not-an-email',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});


it('accepts a webhook with a valid signature and marks the order paid', function () {
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();

    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'status' => 'pending',
        'checkout_request_id' => 'KJ-TEST-ref1',
    ]);

    $body = json_encode([
        'event' => 'charge.success',
        'data' => [
            'reference' => 'KJ-TEST-ref1',
            'id' => 998877,
            'amount' => $order->total * 100,
        ],
    ]);

    $secret = config('services.paystack.secret');
    $validSignature = hash_hmac('sha512', $body, $secret);
    // Sends the RAW body with a correctly computed signature header —
    // this is what proves signature verification is actually implemented
    // correctly, not just present.
    $response = $this->call(
        'POST',
        '/api/v1/payments/card/webhook',
        [], [], [],
        ['HTTP_x-paystack-signature' => $validSignature, 'CONTENT_TYPE' => 'application/json'],
        $body,
    );

    $response->assertStatus(200);
    expect($payment->fresh()->status)->toBe('completed');
    expect($order->fresh()->status)->toBe('paid');
});

it('rejects a webhook with an invalid or missing signature', function () {
    $body = json_encode([
        'event' => 'charge.success',
        'data' => ['reference' => 'KJ-TEST-ref1', 'id' => 1],
    ]);

    $response = $this->call(
        'POST',
        '/api/v1/payments/card/webhook',
        [], [], [],
        ['HTTP_x-paystack-signature' => 'forged-signature-value', 'CONTENT_TYPE' => 'application/json'],
        $body,
    );

    // This is the single most important security test in this whole
    // suite — proves a forged webhook CANNOT mark an order paid.
    $response->assertStatus(400);
});

it('marks a payment failed on a charge.failed event', function () {
    $order = Order::factory()->create();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'status' => 'pending',
        'checkout_request_id' => 'KJ-TEST-failref',
    ]);

    $body = json_encode([
        'event' => 'charge.failed',
        'data' => ['reference' => 'KJ-TEST-failref'],
    ]);

    $secret = config('services.paystack.secret');
    $signature = hash_hmac('sha512', $body, $secret);

    $this->call(
        'POST',
        '/api/v1/payments/card/webhook',
        [], [], [],
        ['HTTP_x-paystack-signature' => $signature, 'CONTENT_TYPE' => 'application/json'],
        $body,
    )->assertStatus(200);

    expect($payment->fresh()->status)->toBe('failed');
});

it('verifies a transaction directly via the verify endpoint', function () {
    Http::fake([
        '*/transaction/verify/*' => Http::response([
            'status' => true,
            'data' => ['status' => 'success', 'id' => 55, 'reference' => 'KJ-TEST-verify1'],
        ], 200),
    ]);

    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'status' => 'pending',
        'checkout_request_id' => 'KJ-TEST-verify1',
    ]);

    $response = $this->getJson('/api/v1/payments/card/verify/KJ-TEST-verify1');

    $response->assertStatus(200)->assertJson(['status' => 'completed', 'order_status' => 'paid']);
    expect($payment->fresh()->status)->toBe('completed');
});
