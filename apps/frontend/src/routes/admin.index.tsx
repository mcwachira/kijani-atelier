import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, Boxes, Receipt, TrendingUp, Users } from 'lucide-react'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { dashboardStatsQuery } from '@/lib/queries'
import { formatDate, formatKes } from '@/lib/format'

export const Route = createFileRoute('/admin/')({
  head: () => ({
    meta: [
      { title: 'Dashboard — Kijani Atelier Admin' },
      {
        name: 'description',
        content:
          'Sales, orders and revenue overview for the Kijani Atelier store.',
      },
      { property: 'og:title', content: 'Dashboard — Kijani Atelier Admin' },
      { property: 'og:description', content: 'Sales and orders overview.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminOverview,
})


function AdminOverview() {
  const { data, isLoading, isError, error, refetch } = useQuery(
    dashboardStatsQuery(),
  )

  const cards = [
    {
      label: 'Total sales',
      value: data && formatKes(data.total_sales),
      icon: TrendingUp,
    },
    { label: 'Orders', value: data?.orders_count, icon: Receipt },
    { label: 'Customers', value: data?.customers_count, icon: Users },
    {
      label: 'Avg. order value',
      value: data && formatKes(data.average_order_value),
      icon: Boxes,
    },
  ]

  return (
    <AdminLayout
      title="Overview"
      description="How the atelier is trading this month."
    >
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {error.message || 'Could not load the dashboard.'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="eyebrow">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 shrink-0 text-accent" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="font-display text-3xl">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-xl">Revenue</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenue_series}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--color-card-foreground)',
                  }}
                  formatter={(v) => formatKes(Number(v ?? 0))}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-xl">Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recent_orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.reference}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell>{o.county}</TableCell>
                  <TableCell>{formatDate(o.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKes(o.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}

