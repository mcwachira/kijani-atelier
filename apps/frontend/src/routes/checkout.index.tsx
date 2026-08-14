import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CreditCard, Loader2, Smartphone } from 'lucide-react'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createOrder,
  getPaymentStatus,
  initiateMpesaPayment,
  initiatePaystackPayment,
  type ApiError,
} from '@/lib/api'
import { formatKes } from '@/lib/format'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

const COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Kiambu',
  'Machakos',
  'Uasin Gishu',
  'Nyeri',
  'Kilifi',
  'Kajiado',
]

export const Route = createFileRoute('/checkout/')({
  head: () => ({
    meta: [
      { title: 'Checkout — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Complete your order with M-Pesa or card. Delivery across Kenya in 3–5 days.',
      },
      { property: 'og:title', content: 'Checkout — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Pay with M-Pesa or card. Delivery across Kenya.',
      },
    ],
  }),
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, subtotal, shipping, total, clear } = useCart()
  const navigate = useNavigate()
  const [payment, setPayment] = useState<'mpesa' | 'card'>('mpesa')
  const [county, setCounty] = useState('Nairobi')

  // Once the order is created, we stop showing the delivery form and
  // show the PAYMENT step instead — the order itself isn't "done" until
  // money has actually moved, so we deliberately don't navigate to
  // /checkout/success until that happens.
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      clear() // backend also clears server-side; this keeps local state in sync immediately
      setPlacedOrder(order)
    },
    onError: () =>
      toast.error("We couldn't place that order. Please try again."),
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!items.length) {
      toast.error('Your bag is empty.')
      return
    }
    const form = new FormData(e.currentTarget)
    mutation.mutate({
      name: String(form.get('name')),
      email: String(form.get('email')),
      phone: String(form.get('phone')),
      address: String(form.get('address')),
      town: String(form.get('town')),
      county,
      payment_method: payment,
      items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        size: i.size,
      })),
    })
  }

  // Once an order exists, show the payment step instead of the form.
  if (placedOrder) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow">Order {placedOrder.reference}</p>
          <h1 className="mt-2 font-display text-4xl">Complete payment</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Total due: {formatKes(placedOrder.total)}
          </p>

          <div className="mt-8">
            {payment === 'mpesa' ? (
              <MpesaPayment order={placedOrder} navigate={navigate} />
            ) : (
              <CardPayment order={placedOrder} />
            )}
          </div>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="font-display text-4xl lg:text-5xl">Checkout</h1>
        <form
          onSubmit={submit}
          className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="space-y-10">
            <section>
              <h2 className="eyebrow">Delivery details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="07xx xxx xxx"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Address / delivery point</Label>
                  <Input
                    id="address"
                    name="address"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="county">County</Label>
                  <Select value={county} onValueChange={setCounty}>
                    <SelectTrigger id="county" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="town">Town / estate</Label>
                  <Input id="town" name="town" required className="mt-1.5" />
                </div>
              </div>
            </section>
            <section>
              <h2 className="eyebrow">Payment</h2>
              <RadioGroup
                value={payment}
                onValueChange={(v) => setPayment(v as 'mpesa' | 'card')}
                className="mt-5 grid gap-3 sm:grid-cols-2"
              >
                {[
                  {
                    value: 'mpesa',
                    label: 'M-Pesa',
                    hint: 'Pay via STK push',
                    icon: Smartphone,
                  },
                  {
                    value: 'card',
                    label: 'Card',
                    hint: 'Visa & Mastercard',
                    icon: CreditCard,
                  },
                ].map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={opt.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                      payment === opt.value
                        ? 'border-accent bg-secondary/60'
                        : 'border-border',
                    )}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <opt.icon className="h-5 w-5 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {opt.hint}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </section>
          </div>
          <aside className="h-fit rounded-lg border border-border bg-card p-6 shadow-(--shadow-soft)">
            <h2 className="font-display text-xl">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <img
                    src={i.product.images[0]}
                    alt=""
                    loading="lazy"
                    className="h-14 w-12 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{i.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {i.quantity}
                      {i.size ? ` · Size ${i.size}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">
                    {formatKes(i.product.price * i.quantity)}
                  </p>
                </li>
              ))}
              {!items.length && (
                <li className="text-sm text-muted-foreground">
                  Nothing in your bag yet —{' '}
                  <Link to="/shop" className="underline">
                    browse the collection
                  </Link>
                  .
                </li>
              )}
            </ul>
            <Separator className="my-5" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatKes(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>{formatKes(shipping)}</dd>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-medium">
                <dt>Total</dt>
                <dd>{formatKes(total)}</dd>
              </div>
            </dl>
            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Placing order…' : 'Place order'}
            </Button>
          </aside>
        </form>
      </div>
    </StoreLayout>
  )
}

/**
 * M-Pesa step — collects a phone number, triggers the STK push, then
 * polls GET /payments/{paymentId}/status every 3s until the async
 * callback resolves it to completed/failed, or ~2 minutes elapse.
 */
function MpesaPayment({
  order,
  navigate,
}: {
  order: Order
  navigate: ReturnType<typeof useNavigate>
}) {
  const [phone, setPhone] = useState('')
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [phase, setPhase] = useState<
    'idle' | 'submitting' | 'waiting' | 'failed' | 'timedout'
  >('idle')
  const attempts = useRef(0)

  useEffect(() => {
    if (!paymentId || phase !== 'waiting') return
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      try {
        const result = await getPaymentStatus(paymentId)
        if (cancelled) return

        if (result.status === 'completed') {
          navigate({
            to: '/checkout/success',
            search: { reference: order.reference, trxref: undefined },
          })
          return
        }
        if (result.status === 'failed') {
          setPhase('failed')
          return
        }

        attempts.current += 1
        if (attempts.current >= 40) {
          setPhase('timedout')
          return
        }
        setTimeout(poll, 3000)
      } catch {
        if (!cancelled) setTimeout(poll, 3000)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [paymentId, phase, navigate, order.reference])

  const initiate = async () => {
    if (!/^(0|\+?254)[71]\d{8}$/.test(phone)) {
      toast.error('Enter a valid M-Pesa phone number.')
      return
    }
    setPhase('submitting')
    try {
      const res = await initiateMpesaPayment({
        order_reference: order.reference,
        phone,
      })
      setPaymentId(res.payment_id)
      attempts.current = 0
      setPhase('waiting')
      toast.success('Check your phone to complete payment.')
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Could not start M-Pesa payment.',
      )
      setPhase('idle')
    }
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-sm font-medium">Check your phone</p>
        <p className="text-xs text-muted-foreground">
          Enter your M-Pesa PIN to complete payment.
        </p>
      </div>
    )
  }

  if (phase === 'failed' || phase === 'timedout') {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">
          {phase === 'timedout'
            ? 'This took too long — please try again.'
            : 'Payment was not completed.'}
        </p>
        <Button
          className="mt-4 w-full"
          variant="outline"
          onClick={() => {
            setPhase('idle')
            setPaymentId(null)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
      <Input
        id="mpesa-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="0712345678"
        className="mt-1.5"
      />
      <Button
        className="mt-4 w-full"
        onClick={initiate}
        disabled={phase === 'submitting'}
      >
        {phase === 'submitting'
          ? 'Sending prompt…'
          : `Pay ${formatKes(order.total)} via M-Pesa`}
      </Button>
    </div>
  )
}

/**
 * Card step — redirects the whole browser to Paystack's hosted checkout
 * page. Card details are entered there, never on this site (required
 * for PCI compliance). Paystack redirects back to /checkout/success
 * afterward, which verifies the transaction directly.
 */
function CardPayment({ order }: { order: Order }) {
  const [email, setEmail] = useState(order.email ?? '')
  const [submitting, setSubmitting] = useState(false)

  const initiate = async () => {
    if (!email.includes('@')) {
      toast.error('Enter a valid email for your card receipt.')
      return
    }
    setSubmitting(true)
    try {
      const res = await initiatePaystackPayment({
        order_reference: order.reference,
        email,
      })
      // Paystack's redirect back appends ITS OWN ?reference=&trxref=
      // params, overwriting whatever "reference" means to this app.
      // Stash the real order reference here so /checkout/success can
      // recover it regardless of what Paystack's redirect URL looks like.
      sessionStorage.setItem('kijani_pending_order_reference', order.reference)
      window.location.href = res.authorization_url
    } catch (err) {
      toast.error((err as ApiError).message || 'Could not start card payment.')
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <Label htmlFor="card-email">Email (for your receipt)</Label>
      <Input
        id="card-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1.5"
      />
      <Button className="mt-4 w-full" onClick={initiate} disabled={submitting}>
        {submitting ? 'Redirecting…' : `Pay ${formatKes(order.total)} by card`}
      </Button>
    </div>
  )
}