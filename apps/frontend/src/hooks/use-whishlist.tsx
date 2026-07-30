import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'

// LocalStorage key prefix for versioned persistence
const STORAGE_KEY = 'kijani-wishlist-v1'

/** Represents a single product entry stored within the user's wishlist */
export interface WishlistItem {
  product: Product
  size: number | null
  added_at: string
}

/** Shape of the Wishlist React Context value provided across the application */
interface WishlistContextValue {
  /** Array of currently wishlisted items */
  items: WishlistItem[]
  /** Total count of wishlisted items */
  count: number
  /** True once client-side LocalStorage restoration complete (prevents SSR hydration mismatches) */
  hydrated: boolean
  /** Checks if a specific product exists in the wishlist by ID */
  has: (productId: number) => boolean
  /** Adds a product to the wishlist with an optional chosen size */
  add: (product: Product, size?: number | null) => void
  /** Removes a product from the wishlist by ID */
  remove: (productId: number) => void
  /** Toggles a product in/out of the wishlist; returns boolean indicating if item is now saved */
  toggle: (product: Product, size?: number | null) => boolean
  /** Updates the selected size variant for an existing wishlisted product */
  setSize: (productId: number, size: number | null) => void
  /** Clears all items from the wishlist */
  clear: () => void
}

// React Context initialization
const WishlistContext = createContext<WishlistContextValue | null>(null)

/**
 * Safely parses and validates raw JSON string data read from LocalStorage.
 * Guarantees a clean array of `WishlistItem` objects even if data structure is corrupted or outdated.
 */
function parseStored(raw: string | null): WishlistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((i): i is WishlistItem => {
        // Runtime runtime structural check to verify product object exists
        const item = i as Partial<WishlistItem>
        return !!item?.product && typeof item.product.id === 'number'
      })
      .map((i) => ({
        product: i.product,
        size: typeof i.size === 'number' ? i.size : null,
        added_at:
          typeof i.added_at === 'string'
            ? i.added_at
            : new Date().toISOString(),
      }))
  } catch {
    return [] // Fallback to empty wishlist on JSON parse failure
  }
}

/**
 * WishlistProvider Component
 * Context provider that manages wishlist state, handles LocalStorage persistence,
 * syncs updates across browser tabs, and exposes methods to components.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // 1. Client-side Hydration Effect:
  // Runs once on mount to populate state from LocalStorage safely in Next.js / SSR setups
  useEffect(() => {
    const restored = parseStored(window.localStorage.getItem(STORAGE_KEY))
    if (restored.length)
      setItems((current) => (current.length ? current : restored))
    setHydrated(true)
  }, [])

  // 2. LocalStorage Persistence Effect:
  // Saves items to LocalStorage whenever items change, but ONLY after initial hydration completes
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* Storage quota exceeded or private browsing unavailable */
    }
  }, [items, hydrated])

  // 3. Multi-Tab Synchronization Effect:
  // Listens for storage events triggered by changes in other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(parseStored(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Determines whether a specific product exists in the wishlist
  const has = useCallback(
    (productId: number) => items.some((i) => i.product.id === productId),
    [items],
  )

  // Adds a product to the top of the wishlist (prevents duplicate entries)
  const add = useCallback((product: Product, size: number | null = null) => {
    setItems((current) =>
      current.some((i) => i.product.id === product.id)
        ? current
        : [{ product, size, added_at: new Date().toISOString() }, ...current],
    )
  }, [])

  // Removes a product from the wishlist by ID
  const remove = useCallback((productId: number) => {
    setItems((current) => current.filter((i) => i.product.id !== productId))
  }, [])

  /**
   * Toggles a product's wishlist status.
   * @returns {boolean} `true` if item was added, `false` if removed.
   */
  const toggle = useCallback(
    (product: Product, size: number | null = null) => {
      const saved = items.some((i) => i.product.id === product.id)
      if (saved) remove(product.id)
      else add(product, size)
      return !saved
    },
    [items, add, remove],
  )

  // Updates the size preference of a specific saved item
  const setSize = useCallback((productId: number, size: number | null) => {
    setItems((current) =>
      current.map((i) => (i.product.id === productId ? { ...i, size } : i)),
    )
  }, [])

  // Clears all entries from the wishlist state
  const clear = useCallback(() => setItems([]), [])

  // Memoize context value object to prevent unnecessary consumer re-renders
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
    }),
    [items, hydrated, has, add, remove, toggle, setSize, clear],
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

/**
 * Custom Hook: `useWishlist`
 * Consumes the `WishlistContext` to provide components access to state and mutation methods.
 * Throws a clear runtime error if used outside of `<WishlistProvider>`.
 */
export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx)
    throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}
