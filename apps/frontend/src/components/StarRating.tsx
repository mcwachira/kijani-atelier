import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  size = 14,
  className,
  interactive,
  onChange,
}: {
  value: number
  size?: number
  className?: string
  interactive?: boolean
  onChange?: (value: number) => void
}) {
  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? undefined : 'img'}
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value)
        const icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              filled ? 'fill-gold text-gold' : 'text-muted-foreground/40',
            )}
          />
        )
        return interactive ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i)}
            aria-pressed={filled}
            aria-label={`Rate ${i}`}
            className="p-0.5"
          >
            {icon}
          </button>
        ) : (
          <span key={i}>{icon}</span>
        )
      })}
    </div>
  )
}
