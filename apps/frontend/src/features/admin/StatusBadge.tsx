import type { OrderStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const styles: Record<OrderStatus, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  paid: 'bg-accent/15 text-accent',
  shipped: 'bg-gold/20 text-foreground',
  delivered: 'bg-primary text-primary-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('rounded-full capitalize', styles[status])}
    >
      {status}
    </Badge>
  )
}
