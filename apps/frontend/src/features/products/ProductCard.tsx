import { Link } from '@tanstack/react-router'
import type { Product } from '@/types'
import { formatKes } from '@/lib/format'
import { StarRating } from '@/components/StarRating'
import { WishlistButton } from '@/components/WishlistButton'
import { Skeleton } from '@/components/ui/skeleton'

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group relative">
      <Link
        to="/products/$productId"
        params={{ productId: String(product.id) }}
        className="block"
      >
        <div className="relative overflow-hidden rounded-md bg-secondary">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            width={1000}
            height={1250}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          {product.is_new && (
            <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-foreground">
              New
            </span>
          )}
        </div>

        <div className="mt-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg leading-tight">
              {product.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.category.name}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-medium">{formatKes(product.price)}</p>
            {product.compare_at_price && (
              <p className="text-xs text-muted-foreground line-through">
                {formatKes(product.compare_at_price)}
              </p>
            )}
          </div>
        </div>

        <StarRating value={product.rating} className="mt-2" />
      </Link>
      <WishlistButton product={product} className="absolute right-3 top-3" />
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-md" />
      <Skeleton className="mt-3.5 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  )
}