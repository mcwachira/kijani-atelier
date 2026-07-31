import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Package, Truck, Home } from 'lucide-react'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { orderQuery } from '@/lib/queries'
import { formatDate, formatKes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STEPS: { status: OrderStatus; label: string; icon: typeof Package }[] = [
  { status: 'pending', label: 'Order placed', icon: CheckCircle2 },
  { status: 'paid', label: 'Payment confirmed', icon: Package },
  { status: 'shipped', label: 'On its way', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: Home },
]

export const Route = createFileRoute('/orders/$reference')({
  head: () => ({
    meta: [
      { title: 'Order Confirmation — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Your order summary, delivery details and current fulfilment status.',
      },
      { property: 'og:title', content: 'Order Confirmation — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Your Kijani Atelier order summary and status.',
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { reference } = Route.useParams()
  const { data: order, isLoading, isError } = useQuery(orderQuery(reference))

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-16 sm:px-6 lg:px-8">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </StoreLayout>
    )
  }

  if (isError || !order) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl">
            We couldn't find order {reference}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Check the reference in your confirmation email, or get in touch and
            we'll track it down.
          </p>
          <Button asChild className="mt-8">
            <Link
              to="/shop"
              search={{
                min_price: 0,
                max_price: 16000,
                sort: 'newest',
                page: 1,
              }}
            >
              Back to the collection
            </Link>
          </Button>
        </div>
      </StoreLayout>
    )
  }

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.status === order.status),
  )

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-(--shadow-soft)">
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
          <p className="eyebrow mt-4">
            Thank you, {order.customer_name.split(' ')[0]}
          </p>
          <h1 className="mt-2 font-display text-4xl lg:text-5xl">
            Order {order.reference}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Placed on {formatDate(order.created_at)} · A confirmation is on its
            way to {order.email}.
          </p>
          <div className="mt-5 flex justify-center">
            <StatusBadge status={order.status} />
          </div>
        </div>

        <section className="mt-10">
          <h2 className="eyebrow">Status</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-4">
            {STEPS.map((step, i) => {
              const done = order.status !== 'cancelled' && i <= activeIndex
              return (
                <li
                  key={step.status}
                  className={cn(
                    'rounded-lg border p-4',
                    done ? 'border-accent/60 bg-secondary/50' : 'border-border',
                  )}
                >
                  <step.icon
                    className={cn(
                      'h-5 w-5',
                      done ? 'text-accent' : 'text-muted-foreground/50',
                    )}
                  />
                  <p
                    className={cn(
                      'mt-2 text-sm',
                      done ? 'font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </p>
                </li>
              )
            })}
          </ol>
          {order.status === 'cancelled' && (
            <p className="mt-4 text-sm text-destructive">
              This order was cancelled. Please contact us for a refund.
            </p>
          )}
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section>
            <h2 className="eyebrow">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {order.items.map((item, i) => (
                <li
                  key={`${item.product_name}-${i}`}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.quantity}
                      {item.size ? ` · Size ${item.size}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">
                    {formatKes(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <Separator className="my-5" />
            <div className="flex justify-between text-base font-medium">
              <span>Total paid</span>
              <span>{formatKes(order.total)}</span>
            </div>
          </section>

          <aside className="h-fit rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-xl">Delivery</h2>
            <address className="mt-4 space-y-1 text-sm not-italic text-muted-foreground">
              <p className="text-foreground">{order.customer_name}</p>
              <p>{order.address}</p>
              <p>
                {order.town}, {order.county}
              </p>
              <p>{order.phone}</p>
            </address>
            <Separator className="my-5" />
            <p className="text-xs text-muted-foreground">
              Paid by {order.payment_method === 'mpesa' ? 'M-Pesa' : 'card'} ·
              Delivery in 3–5 working days.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link
                to="/shop"
                search={{
                  min_price: 0,
                  max_price: 16000,
                  sort: 'newest',
                  page: 1,
                }}
              >
                Continue shopping
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </StoreLayout>
  )
}
