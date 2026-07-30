import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CreditCard, Smartphone } from 'lucide-react'

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
import { createOrder } from '@/lib/api'
import { formatKes } from '@/lib/format'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'

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

export const Route = createFileRoute('/checkout')({
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

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      clear()
      toast.success(
        `Order ${order.reference} placed. We'll be in touch shortly.`,
      )
      navigate({
        to: '/orders/$reference',
        params: { reference: order.reference },
      })
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

          <aside className="h-fit rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-xl">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <img
                    src={i.product.images[0]}
                    alt={i.product.name}
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
