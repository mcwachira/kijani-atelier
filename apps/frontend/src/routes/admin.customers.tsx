import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { customersQuery } from '@/lib/queries'
import { formatKes } from '@/lib/format'

export const Route = createFileRoute('/admin/customers')({
  head: () => ({
    meta: [
      { title: 'Customers — Kijani Atelier Admin' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminCustomers,
})

function AdminCustomers() {
  const { data, isLoading } = useQuery(customersQuery())

  return (
    <AdminLayout
      title="Customers"
      description="Everyone who's created an account."
    >
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="overflow-x-auto pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No customers yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/admin/customers/$customerId"
                        params={{ customerId: String(customer.id) }}
                        className="hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.created_at}</TableCell>
                    <TableCell className="text-right">
                      {customer.orders_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKes(customer.orders_sum_total ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
