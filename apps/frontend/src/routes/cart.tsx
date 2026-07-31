import { createFileRoute, Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/hooks/use-cart'
import { formatKes } from '@/lib/format'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [
      { title: 'Your Bag — Kijani Atelier' },
      {
        name: 'description',
        content: 'Review the handcrafted pieces in your bag before checkout.',
      },
      { property: 'og:title', content: 'Your Bag — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Review your handcrafted pieces before checkout.',
      },
    ],
  }),
  component: CartPage,
})

function CartPage() {
  const { items, subtotal, shipping, total, updateQuantity, removeItem } =
    useCart()

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="font-display text-4xl lg:text-5xl">Your bag</h1>

        {items.length === 0 ? (
          <div className="mt-12 rounded-md border border-dashed border-border py-24 text-center">
            <p className="font-display text-2xl">Your bag is empty</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with something woven by hand.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">Shop the collection</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <ul className="space-y-8">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[6rem_minmax(0,1fr)] gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]"
                >
                  <Link
                    to="/products/$productId"
                    params={{ productId: String(item.product.id) }}
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      loading="lazy"
                      className="aspect-4/5 w-full rounded-md object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-xl">
                          {item.product.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.product.category.name}
                          {item.size ? ` · Size ${item.size}` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium">
                        {formatKes(item.product.price * item.quantity)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <div className="flex items-center rounded-md border border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-lg border border-border bg-card p-6 shadow-(--shadow-soft)">
              <h2 className="font-display text-xl">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
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
              <Button asChild size="lg" className="mt-6 w-full">
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
              <Link
                to="/shop"
                className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
