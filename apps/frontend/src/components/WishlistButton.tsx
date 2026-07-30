import { Heart } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useWishlist } from '@/hooks/use-whishlist.tsx'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

export function WishlistButton({
  product,
  size = null,
  variant = 'icon',
  className,
}: {
  product: Product
  size?: string | null
  variant?: 'icon' | 'full'
  className?: string
}) {
  const wishlist = useWishlist()
  const saved = wishlist.has(product.id)

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nowSaved = wishlist.toggle(product, size)
    toast.success(
      nowSaved
        ? `${product.name} saved to your wishlist.`
        : `${product.name} removed from your wishlist.`,
    )
  }

  if (variant === 'full') {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onToggle}
        className={className}
      >
        <Heart className={cn('mr-2 h-4 w-4', saved && 'fill-current')} />
        {saved ? 'Saved to wishlist' : 'Save to wishlist'}
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${product.name} from wishlist`
          : `Save ${product.name} to wishlist`
      }
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-background',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-current text-accent')} />
    </button>
  )
}
