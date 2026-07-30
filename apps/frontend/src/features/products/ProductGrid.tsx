import type { Product } from '@/types'
import { ProductCard, ProductCardSkeleton } from './ProductCard'

export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 6,
}: {
  products?: Product[]
  isLoading?: boolean
  skeletonCount?: number
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!products?.length) {
    return (
      <div className="rounded-md border border-dashed border-border py-20 text-center">
        <p className="font-display text-xl">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try widening your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
