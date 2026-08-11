<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;

/**
 * @group Admin Customers
 */

class CustomerController extends Controller
{
    /**
     * List customers with order counts
     *
     * @authenticated
     */
    public function index()
    {
        $customers = User::where('role', 'customer')
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->latest()
            ->paginate(20);

        return response()->json(['data' => $customers]);
    }

    /**
     * A single customer's order history
     *
     * @authenticated
     */
    public function show(User $customer)
    {
        abort_if($customer->role !== 'customer', 404);

        $customer->load(['orders' => fn ($q) => $q->with('items')->latest()]);

        return response()->json(['data' => $customer]);
    }
}
