import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { salesAnalyticsQuery } from '@/lib/queries'
import { formatKes } from '@/lib/format'

const REGIONS = [
  'All regions',
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Kiambu',
  'Machakos',
  'Eldoret',
]

export const Route = createFileRoute('/admin/analytics')({
  head: () => ({
    meta: [
      { title: 'Sales Analytics — Kijani Atelier Admin' },
      {
        name: 'description',
        content:
          'Revenue by month, sales per Kenyan region and top-selling handcrafted pieces.',
      },
      {
        property: 'og:title',
        content: 'Sales Analytics — Kijani Atelier Admin',
      },
      {
        property: 'og:description',
        content: 'Revenue, regional sales and best sellers.',
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminAnalytics,
})

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-card-foreground)',
}

function AdminAnalytics() {
  const [region, setRegion] = useState('All regions')
  const [from, setFrom] = useState('2026-02-01')
  const [to, setTo] = useState('2026-07-31')

  const { data, isLoading } = useQuery(
    salesAnalyticsQuery({
      from,
      to,
      region: region === 'All regions' ? undefined : region,
    }),
  )

  return (
    <AdminLayout
      title="Sales analytics"
      description="Where the pieces are going, and what is moving."
    >
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Revenue trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.by_month}>
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
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => formatKes(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Sales per region
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.by_region}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="region"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => formatKes(v)}
                  />
                  <Bar
                    dataKey="sales"
                    fill="var(--color-chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Top-selling products
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Units sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.top_products.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.units}</TableCell>
                  <TableCell className="text-right">
                    {formatKes(p.revenue)}
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
