import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'
import { usePersistedState } from './use-persisted-state'
import { syncWishlist } from '@/lib/api'

const STORAGE_KEY = 'kijani-wishlist-v1'

export interface WishlistItem {
  product: Product
  size: string | null
  added_at: string
}

interface WishlistContextValue {
  items: WishlistItem[]
  count: number
  hydrated: boolean
  has: (productId: number) => boolean
  add: (product: Product, size?: string | null) => void
  remove: (productId: number) => void
  toggle: (product: Product, size?: string | null) => boolean
  setSize: (productId: number, size: string | null) => void
  clear: () => void
  // New: pushes the current LOCAL wishlist into the real backend —
  // call this once, right after login/register succeeds.
  syncToServer: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function parseStored(raw: string | null): WishlistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((i): i is WishlistItem => {
        const item = i as Partial<WishlistItem>
        return !!item?.product && typeof item.product.id === 'number'
      })
      .map((i) => ({
        product: i.product,
        size:
          typeof i.size === 'string'
            ? i.size
            : typeof i.size === 'number' && Number.isFinite(i.size)
              ? String(i.size)
              : null,
        added_at:
          typeof i.added_at === 'string'
            ? i.added_at
            : new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems, hydrated] = usePersistedState(
    STORAGE_KEY,
    parseStored,
  )

  const has = useCallback(
    (productId: number) => items.some((i) => i.product.id === productId),
    [items],
  )

  const add = useCallback((product: Product, size: string | null = null) => {
    setItems((current) =>
      current.some((i) => i.product.id === product.id)
        ? current
        : [{ product, size, added_at: new Date().toISOString() }, ...current],
    )
  }, [])

  const remove = useCallback((productId: number) => {
    setItems((current) => current.filter((i) => i.product.id !== productId))
  }, [])

  const toggle = useCallback(
    (product: Product, size: string | null = null) => {
      const saved = items.some((i) => i.product.id === product.id)
      if (saved) remove(product.id)
      else add(product, size)
      return !saved
    },
    [items, add, remove],
  )

  const setSize = useCallback((productId: number, size: string | null) => {
    setItems((current) =>
      current.map((i) => (i.product.id === productId ? { ...i, size } : i)),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  // One-directional: LOCAL → server only. We don't pull the backend's
  // list back down and merge it into local state, since local `items`
  // already holds full Product objects and is the UI's source of truth —
  // there's nothing the server response would usefully add here. If the
  // sync call fails, we swallow it silently: a failed wishlist sync
  // should never block login from succeeding.
  const syncToServer = useCallback(async () => {
    if (!items.length) return
    try {
      await syncWishlist(
        items.map((i) => ({ product_id: i.product.id, size: i.size })),
      )
    } catch {
      // non-fatal — local wishlist still works regardless
    }
  }, [items])

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      count: items.length,
      hydrated,
      has,
      add,
      remove,
      toggle,
      setSize,
      clear,
      syncToServer,
    }),
    [items, hydrated, has, add, remove, toggle, setSize, clear, syncToServer],
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx)
    throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}
