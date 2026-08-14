<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusEvent;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;


/**
 * @group Orders
 */
class OrderController extends Controller
{
    /**
     * Place an order (checkout)
     *
     * Guest checkout is supported — no account required. Prices/stock are
     * re-read from the database here, NEVER trusted from the request — a
     * tampered client-side price can never affect what's actually charged.
     *
     * @unauthenticated
     * @header X-Cart-Token Sent so the guest's cart can be cleared after checkout.
     */

    public function store(StoreOrderRequest $request)
    {
        $data = $request->validated();
        // Wrapped in a transaction: if ANYTHING fails partway through
        // (a stock check, an order_item insert), the whole operation
        // rolls back — you never end up with an order that has no items,
        // or stock decremented with no matching order to explain why.

        $order = DB::transaction(function () use ($data, $request) {
            $line = [];
            $total = 0;


        foreach ($data['items'] as $line) {
            // lockForUpdate() prevents a race condition where two
            // simultaneous checkouts both read the same stock count
            // and both believe there's enough, over-selling the item.
            $product = Product::lockForUpdate()->findOrFail($line['product_id']);

            if ($product->stock < $line['quantity']) {
                abort(422, "Not enough stock for {$product->name}.");
            }

            $lines[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'price' => $product->price,
                'quantity' => $line['quantity'],
                'size' => $line['size'] ?? null,
            ];


            $total += $product->price * $line['quantity'];
        }

        $order =  new Order();
        $order->fill([
            'user_id' => $request->user()?->id,
            'reference' => 'KJ-' . strtoupper(Str::random(6)),
            'customer_name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'county' => $data['county'],
            'town' => $data['town'],
            'address' => $data['address'],
            'payment_method' => $data['payment_method'],
    ]);

        // status/total are excluded from Order::$fillable on purpose
        // — forceFill is how trusted app code (this checkout flow) is
        // allowed to set them anyway.
        $order->forceFill(['status' => 'pending', 'total' => $total]);
        $order->save();

        foreach ($lines as $line) {
            OrderItem::create([...$line, 'order_id' => $order->id]);
            Product::where('id', $line['product_id'])->decrement('stock', $line['quantity']);
        }

        OrderStatusEvent::create([
            'order_id' => $order->id,
            'actor_id' => null,
            'from_status' => null,
            'to_status' => 'pending',
            'note' => 'Order placed by customer.',
            'actor' => 'System',
        ]);

        return $order;
    });

        // Clear whichever cart was just checked out — guest or logged-in.
        // Outside the transaction since a cart-clear failure shouldn't
        // roll back an order that already succeeded.
    if ($request->user()) {
    Cart::where('user_id', $request->user()->id)->first()?->items()->delete();
    } elseif ($token = $request->header('X-Cart-Token')) {
    Cart::where('guest_token', $token)->first()?->items()->delete();
    }

    $order->load('items', 'statusHistory');

    return (new OrderResource($order))->response()->setStatusCode(201);
}


    /**
     * Look up an order by reference
     *
     * Public — a customer can check their order status with just the
     * reference code (e.g. from a confirmation email), no login required.
     *
     * @unauthenticated
     * @urlParam reference string required Example: KJ-AB12CD
     */

    public function show(string $reference)
    {
        $order = Order::with('items', 'statusHistory')->where('reference', $reference)->firstOrFail();

    return new OrderResource($order);
    }

    /**
     * List the logged-in user's own orders
     *
     * @authenticated
     */
    public function index(Request $request)
    {
        $orders = $request->user()->orders()->with('items', 'statusHistory')->latest()->get();

        return OrderResource::collection($orders);
    }

    /**
     * List ALL orders (admin)
     *
     * @authenticated
     */

    public function adminIndex()
    {
        $orders = Order::with('items', 'statusHistory')->latest()->paginate(20);
        return OrderResource::collection($orders);
    }

    /**
     * Update an order's status (admin)
     *
     * Records a new OrderStatusEvent every time — this is what builds the
     * order's audit trail. The status column itself is also updated to
     * match, so simple queries ("all pending orders") stay fast without
     * needing to inspect the full event history every time.
     *
     * @authenticated
     */

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order)
    {
        $data = $request->validated();

        if (! $order->canTransitionTo($data['status'])) {
            return response()->json([
                'message' => "Cannot change status from '{$order->status}' to '{$data['status']}'.",
            ], 422);
        }

        $previousStatus = $order->status;

        $order->forceFill(['status' => $data['status']])->save();


        OrderStatusEvent::create([
            'order_id' => $order->id,
            'actor_id' => $request->user()->id,
            'from_status' => $previousStatus,
            'to_status' => $data['status'],
            'note' => $data['note'] ?? "Marked {$data['status']}.",
            'actor' => $request->user()->name,
        ]);

        $order->load('items', 'statusHistory');

        return new OrderResource($order);
    }

}
