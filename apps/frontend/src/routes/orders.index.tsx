import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { ordersQuery } from '@/lib/queries'
import { formatKes } from '@/lib/format'

export const Route = createFileRoute('/orders/')({
  head: () => ({
    meta: [
      { title: 'My Orders — Kijani Atelier' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: OrdersPage,
})

function OrdersPage() {
  const { data: orders, isLoading } = useQuery(ordersQuery())
  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-display text-4xl">My orders</h1>
        {isLoading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : !orders?.length ? (
          <p className="mt-8 text-sm text-muted-foreground">
            You haven't placed any orders yet.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to="/orders/$reference"
                params={{ reference: order.reference }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-foreground/30"
              >
                <div>
                  <p className="font-medium">{order.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.created_at}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{formatKes(order.total)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
