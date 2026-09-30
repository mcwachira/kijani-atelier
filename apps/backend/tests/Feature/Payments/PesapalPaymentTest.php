<?php

use App\Jobs\ProcessPesapalNotification;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

function fakePesapal(string $statusCode = '1'): void
{
    config(['pesapal.ipn_id' => 'test-ipn-id', 'pesapal.consumer_key' => 'test-key', 'pesapal.consumer_secret' => 'test-secret']);
    Http::fake([
        '*Auth/RequestToken' => Http::response(['token' => 'fake-token', 'expiryDate' => '2030-01-01'], 200),
        '*SubmitOrderRequest' => Http::response([
            'order_tracking_id' => 'track-123',
            'merchant_reference' => 'KJ-TEST',
            'redirect_url' => 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-123',
            'status' => '200',
        ], 200),
        '*GetTransactionStatus*' => Http::response([
            'payment_status_description' => $statusCode === '1' ? 'Completed' : 'Failed',
            'status_code' => $statusCode,
            'merchant_reference' => 'KJ-TEST',
            'confirmation_code' => 'CONF123',
        ], 200),
    ]);
}

it('submits a Pesapal order and returns the redirect URL', function () {
    fakePesapal();
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending', 'total' => 6800])->save();

    $response = $this->postJson('/api/v1/payments/pesapal/initiate', [
        'order_reference' => $order->reference,
        'email' => 'wanjiru@example.com',
    ]);

    $response->assertStatus(202)
        ->assertJsonPath('order_tracking_id', 'track-123')
        ->assertJsonStructure(['redirect_url', 'payment_id']);

    // The amount sent is the order's server-side total — never client input.
    Http::assertSent(fn ($request) => str_contains($request->url(), 'SubmitOrderRequest')
        && $request['amount'] === 6800
        && $request['currency'] === 'KES');

    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-123',
        'status' => 'pending',
    ]);
});

it('refuses Pesapal initiation for a non-pending order', function () {
    fakePesapal();
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'cancelled'])->save();

    $this->postJson('/api/v1/payments/pesapal/initiate', [
        'order_reference' => $order->reference,
        'email' => 'wanjiru@example.com',
    ])->assertStatus(422);
});

it('marks the order paid when Pesapal reports COMPLETED', function () {
    fakePesapal('1');
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-123',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $this->postJson('/api/v1/payments/pesapal/ipn', ['OrderTrackingId' => 'track-123'])
        ->assertStatus(200);

    expect($payment->fresh()->status)->toBe('completed');
    expect($order->fresh()->status)->toBe('paid');
});

it('marks the payment failed when Pesapal reports FAILED', function () {
    fakePesapal('2');
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-456',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    // IPN path: Pesapal pushes the notification, the controller records
    // it and dispatches the job (sync driver in testing runs it inline).
    $this->postJson('/api/v1/payments/pesapal/ipn', ['OrderTrackingId' => 'track-456'])
        ->assertStatus(200);

    expect($payment->fresh()->status)->toBe('failed');
    expect($order->fresh()->status)->toBe('pending');
});

it('dispatches the reconciliation job from the customer status endpoint without transitioning inline', function () {
    // This endpoint exists for the customer polling the "waiting for
    // payment" screen — its only job is to queue a status re-check.
    // Queue::fake() proves the dispatch happens no matter which queue
    // driver the environment uses.
    Queue::fake();

    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-456',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $this->getJson('/api/v1/payments/pesapal/status/track-456')
        ->assertStatus(200)
        ->assertJson(['status' => 'pending', 'order_status' => 'pending']);

    Queue::assertPushed(ProcessPesapalNotification::class, fn ($job) => $job->orderTrackingId === 'track-456');

    // Nothing transitioned — the fake queue never ran the job.
    expect($payment->fresh()->status)->toBe('pending');
});

it('marks the payment failed when the job sees FAILED from Pesapal', function () {
    // The job itself, run directly — queue-driver independent. Both the
    // IPN path and the status endpoint converge here.
    fakePesapal('2');
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-456',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    ProcessPesapalNotification::dispatchSync('track-456');

    expect($payment->fresh()->status)->toBe('failed');
    expect($order->fresh()->status)->toBe('pending');
});

it('reconciles stuck card payments without duplicating', function () {
    fakePesapal('1');
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'card',
        'checkout_request_id' => 'track-789',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();
    Payment::where('id', $payment->id)->update(['created_at' => now()->subHour()]);

    $this->artisan('payments:reconcile', ['--minutes' => 30])->assertSuccessful();

    expect($payment->fresh()->status)->toBe('completed');
    expect($order->fresh()->status)->toBe('paid');

    // Second run changes nothing — exactly once.
    $this->artisan('payments:reconcile', ['--minutes' => 30])->assertSuccessful();
    expect(App\Models\OrderStatusEvent::where('order_id', $order->id)->where('to_status', 'paid')->count())->toBe(1);
});

it('returns 503 when Pesapal is not configured', function () {
    config(['pesapal.consumer_key' => null, 'pesapal.consumer_secret' => null, 'pesapal.ipn_id' => 'x']);
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();

    $this->postJson('/api/v1/payments/pesapal/initiate', [
        'order_reference' => $order->reference,
        'email' => 'wanjiru@example.com',
    ])->assertStatus(503)->assertJsonPath('message', 'Card payments are temporarily unavailable. Please try again or pay with M-Pesa.');
});

it('returns JSON 401 for admin endpoints without a token, even with no Accept header', function () {
    $this->post('/api/v1/admin/messages/1/reply', ['body' => 'hi'])
        ->assertStatus(401)
        ->assertJsonPath('message', 'Unauthenticated.');
});
