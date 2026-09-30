<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;




/**
 * @group Admin Dashboard
 */
class DashboardController extends Controller
{
    /**
     * Dashboard summary stats
     *
     * @authenticated
     */

    public function stats()
    {
        $totalSales     = Order::where("status", '!=', 'cancelled')->sum('total');
        $ordersCount = Order::count();
        $customerCount = User::where('role', 'customer')->count();

        $revenueSeries = Order::query()
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', now()->subMonths(6))
            ->get(['created_at', 'total'])
            ->groupBy(fn ($o) => $o->created_at->format('Y-m'))
            ->sortKeys()
            ->map(fn ($orders, $key) => [
                'month' => $orders->first()->created_at->format('M'),
                'revenue' => $orders->sum('total'),
                'orders' => $orders->count(),
            ])
            ->values();

        $recentOrders = Order::with('items')->latest()->take(6)->get();

        return response()->json([

            'data'=> [
                'total_sales' => $totalSales,
                'orders_count' => $ordersCount,
                'customers_count' => $customerCount,
                'average_order_value'=>$ordersCount > 0 ? intdiv($totalSales, $ordersCount):0,
                'revenue_series' => $revenueSeries,
                'recent_orders' =>\App\Http\Resources\OrderResource::collection($recentOrders),
            ]
        ]);
    }


    /**
     * Sales analytics
     *
     * @authenticated
     * @queryParam region string Filter by county. Example: Nairobi
     */

    public function analytics(\Illuminate\Http\Request $request)
    {
        $byRegionQuery = Order::query()
            ->where('status', '!=', 'cancelled')
            ->selectRaw("county as region, SUM(total) as sales, COUNT(*) as orders")
            ->groupBy('county')
            ->orderByDesc('sales');

        if ($request->filled('region')) {
            $byRegionQuery->where('county', $request->string('region'));
        }

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', '!=', 'cancelled')
            ->selectRaw('product_name as name, SUM(quantity) as units, SUM(price * quantity) as revenue')
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->take(6)
            ->get();

        $byMonth = Order::query()
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', now()->subMonths(6))
            ->get(['created_at', 'total'])
            ->groupBy(fn ($o) => $o->created_at->format('Y-m'))
            ->sortKeys()
            ->map(fn ($orders) => [
                'month' => $orders->first()->created_at->format('M'),
                'revenue' => $orders->sum('total'),
            ])
            ->values();

        return response()->json([
            'data' => [
                'by_region' => $byRegionQuery->get(),
                'by_month' => $byMonth,
                'top_products' => $topProducts,
            ],
        ]);
    }

}
