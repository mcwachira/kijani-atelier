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
            ->selectRaw("to_char(created_at, 'Mon') as month, SUM(total) as revenue, COUNT(*) as orders")
            ->groupByRaw("to_char(created_at,  'Mon'), date_trunc('month', created_at)")
            ->orderByRaw("date_trunc('month', created_at)")
            ->get();

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

        // Matches stats()'s revenue_series query — same pattern, scoped here
        // to the last 6 months to feed the analytics page's LineChart.
        $byMonth = Order::query()
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', now()->subMonths(6))
            ->selectRaw("to_char(created_at, 'Mon') as month, SUM(total) as revenue")
            ->groupByRaw("to_char(created_at, 'Mon'), date_trunc('month', created_at)")
            ->orderByRaw("date_trunc('month', created_at)")
            ->get();

        return response()->json([
            'data' => [
                'by_region' => $byRegionQuery->get(),
                'by_month' => $byMonth,
                'top_products' => $topProducts,
            ],
        ]);
    }

}
