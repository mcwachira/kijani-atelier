import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Leaf, ShieldCheck, Truck } from 'lucide-react'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { ProductGrid } from '@/features/products/ProductGrid'
import { ProductReviews } from '@/features/products/ProductReviews'
import { StarRating } from '@/components/StarRating'
import { WishlistButton } from '@/components/WishlistButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { productQuery, productsQuery } from '@/lib/queries'
import { formatKes } from '@/lib/format'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/products/$productId')({
  // Runs on the SERVER before the page renders — this is what actually
  // fixes the SEO gap. Without a loader, useQuery only fetches
  // client-side AFTER hydration, so a crawler sees the Skeleton
  // fallback, never the real product content, in the initial HTML.
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(
      productQuery(params.productId),
    )
    return { product }
  },

  // head() now runs AFTER the loader, so it has access to loaderData —
  // this makes the <title>/description/og tags PRODUCT-SPECIFIC instead
  // of the old static, generic copy repeated on every product page.
  head: ({ loaderData }) => {
    const product = loaderData?.product
    return {
      meta: [
        {
          title: product
            ? `${product.name} — Kijani Atelier`
            : 'Product — Kijani Atelier',
        },
        {
          name: 'description',
          content:
            product?.description ??
            'Handcrafted piece made in small batches by artisans in Kenya.',
        },
        {
          property: 'og:title',
          content: product
            ? `${product.name} — Kijani Atelier`
            : 'Product — Kijani Atelier',
        },
        {
          property: 'og:description',
          content:
            product?.description ??
            'Handcrafted piece made in small batches by artisans in Kenya.',
        },
        ...(product?.images?.[0]
          ? [{ property: 'og:image', content: product.images[0] }]
          : []),
      ],
    }
  },

  component: ProductPage,
})


function ProductPage() {
  const { productId } = Route.useParams()
  // useQuery still works exactly as before for CLIENT-SIDE refetching/
  // caching — but since the loader already populated the QueryClient's
  // cache via ensureQueryData, this resolves INSTANTLY on first render,
  // no loading flash, no skeleton, because the data's already there.
  const { data: product, isLoading } = useQuery(productQuery(productId))
  const { addItem } = useCart()
  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState<string | null>(null)

  const { data: related } = useQuery({
    ...productsQuery({
      category: product?.category?.slug,   // second ?. added
      per_page: 4,
    }),
    enabled: !!product?.category,           // also guard enabled on category specifically
  })
  console.log(product);

  if (isLoading || !product) {
    return (
      <StoreLayout>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Skeleton className="aspect-4/5 w-full rounded-md" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </StoreLayout>
    )
  }

  const needsSize = product.sizes.length > 0

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to="/shop"
            search={{ category: product.category.slug }}
            className="hover:text-foreground"
          >
            {product.category.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-foreground">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <img
              src={product.images[activeImage]}
              alt={product.name}
              width={1000}
              height={1250}
              className="aspect-[4/5] w-full rounded-md object-cover"
            />
            <div className="mt-4 flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'w-20 overflow-hidden rounded-md border-2 transition-colors',
                    i === activeImage ? 'border-accent' : 'border-transparent',
                  )}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="lg:pt-2">
            <Badge variant="secondary" className="rounded-full">
              Handmade in Kenya
            </Badge>
            <h1 className="mt-4 font-display text-4xl leading-tight lg:text-5xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StarRating value={product.rating} size={16} />
              <span className="text-xs text-muted-foreground">
                {product.reviews_count} reviews
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <p className="font-display text-3xl">
                {formatKes(product.price)}
              </p>
              {product.compare_at_price && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatKes(product.compare_at_price)}
                </p>
              )}
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            {needsSize && (
              <div className="mt-8">
                <span className="eyebrow">Select size</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.value)}
                      className={cn(
                        'h-11 w-11 rounded-md border text-sm transition-colors',
                        size === s.value
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border hover:border-foreground/40',
                      )}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="w-full sm:w-auto sm:min-w-64"
                onClick={() => {
                  if (needsSize && !size) {
                    toast.error('Please choose a size first.')
                    return
                  }
                  addItem(product, 1, size)
                  toast.success(`${product.name} added to your bag.`)
                }}
              >
                Add to bag
              </Button>
              <WishlistButton
                product={product}
                size={size}
                variant="full"
                className="w-full sm:w-auto"
              />
            </div>

            <Separator className="my-8" />

            <dl className="space-y-4 text-sm">
              <div className="flex gap-3">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <dt className="font-medium">Materials</dt>
                  <dd className="capitalize text-muted-foreground">
                    {product.materials.map((m) => m.name).join(', ')}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <dt className="font-medium">The craft</dt>
                  <dd className="text-muted-foreground">
                    {product.craft_note}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <dt className="font-medium">Delivery</dt>
                  <dd className="text-muted-foreground">
                    3–5 working days countrywide. Free above KSh 15,000.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-24">
          <ProductReviews productId={product.id} />
        </div>

        <div className="mt-24">
          <h2 className="font-display text-2xl">You may also like</h2>
          <div className="mt-8">
            <ProductGrid
              products={related?.data
                .filter((p) => p.id !== product.id)
                .slice(0, 3)}
            />
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
