import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'
import { usePersistedState } from './use-persisted-state'
import { useAuth } from './use-auth'
import {
  addToWishlist,
  getWishlist,
  removeWishlistItem,
  syncWishlist,
  type WishlistItemApi,
} from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
        added_at: typeof i.added_at === 'string' ? i.added_at : new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

// Converts the backend's shape (product nested with wishlist-item id) into
// this hook's local shape (product + size + added_at) — keeps the rest of
// the app working against ONE consistent shape regardless of source.
function fromApi(apiItems: WishlistItemApi[]): WishlistItem[] {
  return apiItems.map((i) => ({
    product: i.product,
    size: i.size,
    added_at: i.added_at,
  }))
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [localItems, setLocalItems, hydrated] = usePersistedState(STORAGE_KEY, parseStored)
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  // Only fetches when logged in — guests never hit this endpoint (it
  // requires auth:sanctum and would just 401).
  const { data: serverItems } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: isAuthenticated,
  })

  // Source of truth switches based on auth state: logged-in users see
  // the SERVER's wishlist (so it's consistent across devices/sessions);
  // guests see their local one. This is the actual fix — previously
  // `items` was ALWAYS local state, even once logged in.
  const items = isAuthenticated && serverItems ? fromApi(serverItems) : localItems

  const has = useCallback((productId: number) => items.some((i) => i.product.id === productId), [items])

  const add = useCallback(
    (product: Product, size: string | null = null) => {
      if (isAuthenticated) {
        // Optimistically update the query cache, then confirm with the
        // real backend call — addToWishlist is idempotent server-side
        // (firstOrCreate), so a failed optimistic update just gets
        // corrected on the next real fetch rather than causing real harm.
        addToWishlist(product.id, size)
          .then(() => queryClient.invalidateQueries({ queryKey: ['wishlist'] }))
          .catch(() => {
            // swallow — the UI will simply not reflect the add; a real
            // app might want a toast here, left to the calling component
          })
        return
      }
      setLocalItems((current) =>
        current.some((i) => i.product.id === product.id)
          ? current
          : [{ product, size, added_at: new Date().toISOString() }, ...current],
      )
    },
    [isAuthenticated, queryClient, setLocalItems],
  )

  const remove = useCallback(
    (productId: number) => {
      if (isAuthenticated) {
        const match = serverItems?.find((i) => i.product.id === productId)
        if (!match) return
        removeWishlistItem(match.id).then(() =>
          queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
        )
        return
      }
      setLocalItems((current) => current.filter((i) => i.product.id !== productId))
    },
    [isAuthenticated, serverItems, queryClient, setLocalItems],
  )

  const toggle = useCallback(
    (product: Product, size: string | null = null) => {
      const saved = items.some((i) => i.product.id === product.id)
      if (saved) remove(product.id)
      else add(product, size)
      return !saved
    },
    [items, add, remove],
  )

  // NOTE: the backend has no "update size on an existing wishlist item"
  // endpoint — only add/remove/sync. For a logged-in user, this
  // effectively removes and re-adds with the new size. Guests still get
  // the original cheap in-place local update.
  const setSize = useCallback(
    (productId: number, size: string | null) => {
      if (isAuthenticated) {
        const match = serverItems?.find((i) => i.product.id === productId)
        if (!match) return
        Promise.resolve()
          .then(() => removeWishlistItem(match.id))
          .then(() => addToWishlist(productId, size))
          .then(() => queryClient.invalidateQueries({ queryKey: ['wishlist'] }))
        return
      }
      setLocalItems((current) =>
        current.map((i) => (i.product.id === productId ? { ...i, size } : i)),
      )
    },
    [isAuthenticated, serverItems, queryClient, setLocalItems],
  )

  const clear = useCallback(() => {
    if (isAuthenticated) {
      // No bulk-clear endpoint exists server-side — remove items one by
      // one. Acceptable given wishlists are typically small; revisit if
      // this ever needs to scale to hundreds of items.
      Promise.all((serverItems ?? []).map((i) => removeWishlistItem(i.id))).then(() =>
        queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
      )
      return
    }
    setLocalItems([])
  }, [isAuthenticated, serverItems, queryClient, setLocalItems])

  // Pushes whatever was tracked locally as a guest into the real backend
  // — call this once, right after login/register succeeds. Unchanged
  // from before, still one-directional and non-fatal on failure.
  const syncToServer = useCallback(async () => {
    if (!localItems.length) return
    try {
      await syncWishlist(localItems.map((i) => ({ product_id: i.product.id, size: i.size })))
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    } catch {
      // non-fatal
    }
  }, [localItems, queryClient])

  // Once synced to the server on login, the local copy has served its
  // purpose — clear it so a subsequent logout doesn't resurrect stale
  // guest-era items alongside whatever the account now has server-side.
  useEffect(() => {
    if (isAuthenticated && localItems.length > 0 && hydrated) {
      setLocalItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hydrated])

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

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}