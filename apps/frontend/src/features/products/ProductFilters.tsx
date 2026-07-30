import { useQuery } from '@tanstack/react-query'
import { categoriesQuery, MAX_PRICE } from '@/lib/queries'
import type { Material, ProductQueryParams } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { formatKes } from '@/lib/format'
import { cn } from '@/lib/utils'

const SIZES = [36, 37, 38, 39, 40, 41]
const MATERIALS: Material[] = ['leather', 'woven', 'beads', 'brass']

export interface FilterState {
  category?: string
  size?: string
  material?: Material
  priceRange: [number, number]
}

export function ProductFilters({
  value,
  onChange,
  onReset,
}: {
  value: FilterState
  onChange: (next: Partial<FilterState>) => void
  onReset: () => void
}) {
  const { data: categories } = useQuery(categoriesQuery())

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 text-xs transition-colors',
      active
        ? 'border-accent bg-accent text-accent-foreground'
        : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
    )

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Filter</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-auto p-0 text-xs"
        >
          Reset
        </Button>
      </div>

      <div>
        <Label className="eyebrow" id="filter-category">Category</Label>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="filter-category">
          <button
            type="button"
            className={chip(!value.category)}
            aria-pressed={!value.category}
            onClick={() => onChange({ category: undefined })}
          >
            All
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              type="button"
              className={chip(value.category === c.slug)}
              aria-pressed={value.category === c.slug}
              onClick={() => onChange({ category: c.slug })}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="eyebrow" id="filter-price">Price</Label>
        <Slider
          className="mt-5"
          min={0}
          max={MAX_PRICE}
          step={500}
          value={value.priceRange}
          onValueChange={(v) =>
            onChange({ priceRange: [v[0], v[1]] as [number, number] })
          }
          aria-label="Price range"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {formatKes(value.priceRange[0])} – {formatKes(value.priceRange[1])}
        </p>
      </div>

      <Separator />

      <div>
        <Label className="eyebrow" id="filter-size">Size (sandals)</Label>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="filter-size">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={chip(value.size === s)}
              aria-pressed={value.size === s}
              onClick={() =>
                onChange({ size: value.size === s ? undefined : s })
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="eyebrow" id="filter-material">Material</Label>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="filter-material">
          {MATERIALS.map((m) => (
            <button
              key={m}
              type="button"
              className={cn(chip(value.material === m), 'capitalize')}
              aria-pressed={value.material === m}
              onClick={() =>
                onChange({ material: value.material === m ? undefined : m })
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export const toQueryParams = (f: FilterState): ProductQueryParams => ({
  category: f.category,
  size: f.size,
  material: f.material,
  min_price: f.priceRange[0],
  max_price: f.priceRange[1],
})
