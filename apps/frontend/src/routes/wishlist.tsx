import { createFileRoute, Link } from '@tanstack/react-router'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/use-cart'
import { useWishlist } from '@/hooks/use-whishlist'
import { formatKes } from '@/lib/format'
import { cn } from '@/lib/utils'


export const Route = createFileRoute("/wishlist")({
  head:() => ({
    meta: [
      { title: "Your Wishlist — Kijani Atelier" },
      {
        name: "description",
        content: "Pieces you've saved for later — move them to your bag whenever you're ready.",
      },
      { property: "og:title", content: "Your Wishlist — Kijani Atelier" },
      { property: "og:description", content: "Saved handcrafted pieces, ready to move to your bag." },
    ],
  }),
  component: WishlistPage,
})

function WishlistPage(){
  const { items, hydrated, remove, setSize, clear } = useWishlist()
  const { addItem } = useCart()

  const moveOne = (productId: number) => {
    const item = items.find((i) => i.product.id === productId)
    if (!item) return
    if (item.product.sizes.length > 0 && item.size == null) {
      toast.error(`Choose a size for ${item.product.name} first.`)
      return
    }
    addItem(item.product, 1, item.size)
    remove(item.product.id)
    toast.success(`${item.product.name} moved to your bag.`)
  }

  const moveAll = () => {
    const ready = items.filter(
      (i) => i.product.sizes.length === 0 || i.size != null,
    )
    if (!ready.length) {
      toast.error('Choose sizes before moving these to your bag.')
      return
    }
    ready.forEach((i) => {
      addItem(i.product, 1, i.size)
      remove(i.product.id)
    })
    toast.success(
      `${ready.length} piece${ready.length === 1 ? '' : 's'} moved to your bag.`,
    )
  }
  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Saved for later</p>
            <h1 className="mt-2 font-display text-4xl lg:text-5xl">
              Your wishlist
            </h1>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
              <Button size="sm" onClick={moveAll}>
                <ShoppingBag className="mr-2 h-4 w-4" /> Move all to bag
              </Button>
            </div>
          )}
        </div>

        {hydrated && items.length === 0 ? (
          <div className="mt-12 rounded-md border border-dashed border-border py-24 text-center">
            <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-4 font-display text-2xl">Nothing saved yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the heart on any piece to keep it here for later.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">Shop the collection</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-10 space-y-8">
            {items.map((item) => (
              <li
                key={item.product.id}
                className="grid grid-cols-[6rem_minmax(0,1fr)] gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <Link
                  to="/products/$productId"
                  params={{ productId:item.product.slug }}
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full rounded-md object-cover"
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
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatKes(item.product.price)}
                    </p>
                  </div>

                  {item.product.sizes.length > 0 && (
                    <div className="mt-4">
                      <span className="eyebrow">Size</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.product.sizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSize(
                                item.product.id,
                                item.size === s ? null : s,
                              )
                            }
                            aria-pressed={item.size === s}
                            className={cn(
                              'h-9 w-9 rounded-md border text-xs transition-colors',
                              item.size === s
                                ? 'border-accent bg-accent text-accent-foreground'
                                : 'border-border hover:border-foreground/40',
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button size="sm" onClick={() => moveOne(item.product.id)}>
                      <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Move to bag
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => remove(item.product.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StoreLayout>
  )
}
