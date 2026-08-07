import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { ProductGrid } from '@/features/products/ProductGrid'
import {
  ProductFilters,
  toQueryParams,
} from '@/features/products/ProductFilters'
import type { FilterState } from '@/features/products/ProductFilters'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { productsQuery, MAX_PRICE } from '@/lib/queries'
import type { Material, ProductQueryParams } from '@/types'

type ShopSearch = {
  category?: string
  search?: string
  size?: string
  material?: Material
  min_price?: number
  max_price?: number
  sort?: NonNullable<ProductQueryParams['sort']>
  page?: number
}

export const Route = createFileRoute('/shop')({
  validateSearch: (raw: Record<string, unknown>): ShopSearch => ({
    category: typeof raw.category === 'string' ? raw.category : undefined,
    search: typeof raw.search === 'string' ? raw.search : undefined,
    size: raw.size ? String(raw.size) : undefined,
    // Material is now a real, admin-editable list (see MaterialController)
    // rather than a fixed set of 4 values — the old hardcoded
    // ['leather','woven','beads','brass'].includes(...) check would
    // silently reject any material an admin adds later (e.g. "raffia",
    // which already exists in seeded data). Trust any non-empty string;
    // the backend's own whereHas('materials', ...) filter simply returns
    // zero results for a name that doesn't exist — no invalid-state risk
    // from accepting it here.
    material:
      typeof raw.material === 'string' && raw.material.length > 0
        ? raw.material
        : undefined,
    min_price: Number(raw.min_price ?? 0),
    max_price: Number(raw.max_price ?? MAX_PRICE),
    sort: (['newest', 'price_asc', 'price_desc'] as const).includes(
      raw.sort as never,
    )
      ? (raw.sort as ShopSearch['sort'])
      : 'newest',
    page: Number(raw.page ?? 1),
  }),
  head: () => ({
    meta: [
      { title: 'Shop All — Sandals, Kiondos & Woven Bags | Kijani Atelier' },
      {
        name: 'description',
        content:
          'Browse handmade leather sandals, beaded sandals, kiondos, woven handbags and accessories. Filter by category, price, size and material.',
      },
      { property: 'og:title', content: 'Shop All — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Handcrafted sandals, kiondos and woven bags from Kenya.',
      },
    ],
  }),
  component: ShopPage,
})

function ShopPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const minPrice = search.min_price ?? 0
  const maxPrice = search.max_price ?? MAX_PRICE
  const sort = search.sort ?? 'newest'
  const page = search.page ?? 1

  const filters: FilterState = {
    category: search.category,
    size: search.size,
    material: search.material,
    priceRange: [minPrice, maxPrice],
  }

  const go = (next: Partial<ShopSearch>) =>
    navigate({ to: '.', search: { ...search, ...next } })

  const setFilters = (next: Partial<FilterState>) =>
    go({
      page: 1,
      category: 'category' in next ? next.category : search.category,
      size: 'size' in next ? next.size : search.size,
      material: 'material' in next ? next.material : search.material,
      min_price: next.priceRange ? next.priceRange[0] : minPrice,
      max_price: next.priceRange ? next.priceRange[1] : maxPrice,
    })

  const reset = () =>
    navigate({
      to: '.',
      search: { min_price: 0, max_price: MAX_PRICE, sort: 'newest', page: 1 },
    })

  const { data, isLoading } = useQuery(
    productsQuery({
      ...toQueryParams(filters),
      search: search.search,
      sort,
      page,
      per_page: 9,
    }),
  )

  const lastPage = data?.meta.last_page ?? 1

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">The collection</p>
            <h1 className="mt-2 truncate font-display text-4xl capitalize lg:text-5xl">
              {search.category ?? 'All pieces'}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto p-6">
                <div className="mt-8">
                  <ProductFilters
                    value={filters}
                    onChange={setFilters}
                    onReset={reset}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Select
              value={sort}
              onValueChange={(v) =>
                go({ sort: v as ShopSearch['sort'], page: 1 })
              }
            >
              <SelectTrigger className="w-[10.5rem]" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">New arrivals</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <ProductFilters
              value={filters}
              onChange={setFilters}
              onReset={reset}
            />
          </aside>

          <div>
            <ProductGrid
              products={data?.data}
              isLoading={isLoading}
              skeletonCount={9}
            />

            {lastPage > 1 && (
              <Pagination className="mt-14">
                <PaginationContent>
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map(
                    (p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => go({ page: p })}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
