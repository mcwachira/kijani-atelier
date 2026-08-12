import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/StatusBadge'
import { orderQuery } from '@/lib/queries'
import { useCart } from '@/hooks/use-cart'
import { formatKes } from '@/lib/format'
import { verifyPaystackPayment } from '@/lib/api'

export const Route = createFileRoute('/checkout/success')({
  validateSearch: (search: Record<string, unknown>) => ({
    reference:
      typeof search.reference === 'string' ? search.reference : undefined,
    // Paystack's OWN redirect param — present only when arriving back
    // from Paystack's hosted checkout, never on an internal navigation
    // (M-Pesa's flow lands here without ever leaving the site).
    trxref: typeof search.trxref === 'string' ? search.trxref : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Order Confirmed — Kijani Atelier' },
      {
        name: 'description',
        content:
          "Thank you for your order. Here's your Kijani Atelier order summary.",
      },
      { property: 'og:title', content: 'Order Confirmed — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Your handcrafted pieces are on their way.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: CheckoutSuccessPage,
})

function CheckoutSuccessPage() {
  const search = Route.useSearch()
  const isPaystackReturn = !!search.trxref

  // On a Paystack return, `reference` in the URL is PAYSTACK'S own
  // transaction reference, not our order reference — recover the real
  // order reference from where CardPayment stashed it right before
  // redirecting away. For the M-Pesa/direct-visit path, search.reference
  // already IS the order reference, same as before.
  const [reference] = useState<string | undefined>(() =>
    isPaystackReturn
      ? (sessionStorage.getItem('kijani_pending_order_reference') ?? undefined)
      : search.reference,
  )

  const [verifying, setVerifying] = useState(isPaystackReturn)
  const [verifyFailed, setVerifyFailed] = useState(false)

  useEffect(() => {
    if (!isPaystackReturn || !search.reference) {
      setVerifying(false)
      return
    }
    // search.reference here is PAYSTACK'S transaction reference — the
    // right value to verify against, distinct from our order reference.
    verifyPaystackPayment(search.reference)
      .catch(() => setVerifyFailed(true))
      .finally(() => {
        setVerifying(false)
        sessionStorage.removeItem('kijani_pending_order_reference')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    data: order,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    ...orderQuery(reference ?? ''),
    enabled: !!reference && !verifying,
  })

  // The bag is cleared here too, so a direct visit or a refresh of the
  // confirmation page can never leave the ordered pieces behind.
  const { items, clear, hydrated } = useCart()
  const clearedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!reference || !hydrated || !order) return
    if (clearedFor.current === reference) return
    clearedFor.current = reference
    if (items.length) clear()
  }, [reference, hydrated, order, items.length, clear])

  if (verifying) {
    return (
      <StoreLayout>
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="mt-4 text-sm text-muted-foreground">
            Confirming your payment…
          </p>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-11 w-11 text-accent" aria-hidden />
          <h1 className="mt-5 font-display text-4xl lg:text-5xl">
            Thank you for your order
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {reference
              ? `Your order ${reference} is confirmed. We'll email you as it moves along.`
              : "Your order is confirmed. We'll email you as it moves along."}
          </p>
          {verifyFailed && (
            <p className="mt-2 text-xs text-destructive">
              We couldn't automatically confirm your card payment — if you were
              charged, it will reflect on your order shortly.
            </p>
          )}
        </div>

        {reference && (
          <div className="mt-10 rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {isError && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  We couldn't load the summary for {reference} right now, but
                  your order was placed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? 'Loading…' : 'Try again'}
                </Button>
              </div>
            )}
            {order && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-xl">
                    Order {order.reference}
                  </h2>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.payment_method === 'mpesa' ? 'M-Pesa' : 'Card'} ·{' '}
                  {order.town}, {order.county}
                </p>
                <ul className="mt-5 space-y-3">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-4 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">
                          {item.product_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Qty {item.quantity}
                          {item.size ? ` · Size ${item.size}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {formatKes(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Separator className="my-5" />
                <div className="flex justify-between text-base font-medium">
                  <span>Total</span>
                  <span>{formatKes(order.total)}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/shop">Continue shopping</Link>
          </Button>
          {reference && (
            <Button asChild size="lg" variant="outline">
              <Link to="/orders/$reference" params={{ reference }}>
                Track this order
              </Link>
            </Button>
          )}
        </div>
      </div>
    </StoreLayout>
  )
}
