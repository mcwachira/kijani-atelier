import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { History, Loader2 } from 'lucide-react'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ordersQuery } from '@/lib/queries'
import { ORDER_TRANSITIONS, updateOrderStatus } from '@/lib/api'
import { formatDate, formatKes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

export const Route = createFileRoute('/admin/orders')({
  head: () => ({
    meta: [
      { title: 'Orders — Kijani Atelier Admin' },
      {
        name: 'description',
        content: 'Track, update and fulfil customer orders across Kenya.',
      },
      { property: 'og:title', content: 'Orders — Kijani Atelier Admin' },
      {
        property: 'og:description',
        content: 'Track and fulfil customer orders.',
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminOrders,
})

function AdminOrders() {
  const { data, isLoading } = useQuery(ordersQuery())
  const [active, setActive] = useState<Order | null>(null)

  return (
    <AdminLayout title="Orders" description="Every order placed, newest first.">
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="overflow-x-auto pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.reference}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>
                      {o.items.reduce((n, i) => n + i.quantity, 0)}
                    </TableCell>
                    <TableCell>
                      {o.town}, {o.county}
                    </TableCell>
                    <TableCell className="text-xs uppercase">
                      {o.payment_method}
                    </TableCell>
                    <TableCell>{formatDate(o.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKes(o.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActive(o)}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderStatusDialog
        order={data?.find((o) => o.id === active?.id) ?? active}
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
      />
    </AdminLayout>
  )
}

function OrderStatusDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState('')
  const [actor, setActor] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', updated.reference] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${updated.reference} marked ${updated.status}.`)
      setStatus(null)
      setNote('')
      setActor('')
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  useEffect(() => {
    setStatus(null)
    setNote('')
    setActor('')
    setError(null)
  }, [order?.id])

  if (!order) return null
  const options = ORDER_TRANSITIONS[order.status]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!status) {
      setError('Choose the new status first.')
      return
    }
    if (status === 'cancelled' && note.trim().length < 5) {
      setError('A cancellation needs a note of at least 5 characters.')
      return
    }
    if (note.trim().length > 280) {
      setError('Keep the note under 280 characters.')
      return
    }
    mutation.mutate({
      id: order.id,
      status,
      note: note.trim(),
      actor: actor.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {order.reference}
          </DialogTitle>
          <DialogDescription>
            {order.customer_name} · {order.town}, {order.county} ·{' '}
            {formatKes(order.total)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current status</span>
          <StatusBadge status={order.status} />
        </div>

        {options.length === 0 ? (
          <p className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
            This order is {order.status} — no further changes are possible.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>New status</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    aria-pressed={status === s}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-xs capitalize transition-colors',
                      status === s
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border hover:border-foreground/40',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="order-actor">Updated by</Label>
              <Input
                id="order-actor"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={60}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="order-note">
                Note{' '}
                {status === 'cancelled' && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                id="order-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                placeholder="Add context for the audit trail…"
                className="mt-2"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {note.length}/280
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save status
              </Button>
            </DialogFooter>
          </form>
        )}

        <Separator />

        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-accent" /> Status history
          </p>
          <ol className="mt-4 space-y-4 border-l border-border pl-5">
            {[...order.status_history].reverse().map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[1.55rem] top-1.5 h-2 w-2 rounded-full bg-accent" />
                <p className="text-sm capitalize">
                  {event.from ? `${event.from} → ${event.to}` : event.to}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.note}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {event.actor} · {formatDate(event.created_at)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  )
}
