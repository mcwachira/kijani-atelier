import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { customerQuery } from '@/lib/queries'
import { formatKes } from '@/lib/format'

export const Route = createFileRoute('/admin/customers/$customerId')({
  head: () => ({
    meta: [
      { title: 'Customer — Kijani Atelier Admin' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminCustomerDetail,
})

function AdminCustomerDetail() {
  const { customerId } = Route.useParams()
  const { data: customer, isLoading } = useQuery(
    customerQuery(Number(customerId)),
  )

  return (
    <AdminLayout title="Customer" description="Account and order history.">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
        </Link>
      </Button>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : !customer ? (
        <p className="text-sm text-muted-foreground">Customer not found.</p>
      ) : (
        <div className="space-y-6">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="pt-6">
              <h2 className="font-display text-2xl">{customer.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.email}
              </p>
              {customer.phone && (
                <p className="text-sm text-muted-foreground">
                  {customer.phone}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Joined {customer.created_at}
                {customer.email_verified_at ? ' · Verified' : ' · Unverified'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="pt-6">
              <h3 className="font-display text-lg">Order history</h3>
              {!customer.orders?.length ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No orders yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {customer.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{order.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.created_at}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          {formatKes(order.total)}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}
