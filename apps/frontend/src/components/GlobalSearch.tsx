import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Clock, Loader2, Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { productsQuery, MAX_PRICE } from '@/lib/queries'
import { formatKes } from '@/lib/format'
import { cn } from '@/lib/utils'

// Default query parameters used when redirecting the user to the full shop page
const SHOP_DEFAULTS = {
  min_price: 0,
  max_price: MAX_PRICE,
  sort: 'newest' as const,
  page: 1,
}

const MAX_RESULTS = 6 // Maximum number of product suggestions to show in the dropdown
const RECENT_KEY = 'kijani.recent-searches' // LocalStorage key for storing search history
const MAX_RECENT = 6 // Limit for recent search history tags

/**
 * Safely reads recent search terms from LocalStorage.
 * Handles SSR environments (checking for `window`) and potential JSON parse errors.
 */
function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(raw)
      ? raw
          .filter((v): v is string => typeof v === 'string')
          .slice(0, MAX_RECENT)
      : []
  } catch {
    return []
  }
}

/**
 * Utility component that highlights matching search query sub-strings inside a target string
 * using HTML <mark> tags.
 */
function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim()
  if (!q) return <>{text}</>

  const parts: React.ReactNode[] = []
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  let i = 0
  let key = 0

  while (i < text.length) {
    const at = lower.indexOf(needle, i)
    if (at === -1) {
      parts.push(text.slice(i))
      break
    }
    if (at > i) parts.push(text.slice(i, at))
    parts.push(
      <mark
        key={key++}
        className="rounded-[2px] bg-accent/30 px-0.5 text-foreground"
      >
        {text.slice(at, at + needle.length)}
      </mark>,
    )
    i = at + needle.length
  }
  return <>{parts}</>
}

/**
 * GlobalSearch Component
 * Provides an auto-completing search bar with debounced input, keyboard navigation,
 * cache prefetching, recent searches history, and accessibility (ARIA) integration.
 */
export function GlobalSearch({
  className,
  onNavigate,
  autoFocus,
  fullScreen,
}: {
  className?: string
  /** Callback fired whenever the user navigates away (e.g., to close mobile sheets/modals) */
  onNavigate?: () => void
  /** Focuses input immediately on mount if true */
  autoFocus?: boolean
  /** Renders the panel inline and always-open, tailored for mobile overlay views */
  fullScreen?: boolean
}) {
  const navigate = useNavigate()

  // State Management
  const [query, setQuery] = useState('') // Instant raw input value
  const [debounced, setDebounced] = useState('') // Debounced input value used for filtering/queries
  const [open, setOpen] = useState(!!fullScreen) // Dropdown open state
  const [activeIndex, setActiveIndex] = useState(-1) // Keyboard navigation cursor position
  const [recent, setRecent] = useState<string[]>([]) // List of recently searched terms

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId() // Unique ID generated for ARIA listbox accessibility

  // Fetch search results server-side using the debounced query term
  const { data, isLoading } = useQuery({
    ...productsQuery({ search: debounced, per_page: MAX_RESULTS }),
    enabled: !!debounced,
  })
  const results = data?.data ?? []

  // Load recent searches from LocalStorage on mount
  useEffect(() => setRecent(readRecent()), [])

  // Auto-focus input if required by parent
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Debounce raw search input by 250ms before sending the search query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  // Search is pending if input is typing or React Query is fetching data
  const pending = query.trim() !== debounced || (isLoading && !!debounced)

  // Saves a search term into LocalStorage and updates local state
  const rememberSearch = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return
    setRecent((prev) => {
      const next = [
        t,
        ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase()),
      ].slice(0, MAX_RECENT)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable / private mode */
      }
      return next
    })
  }, [])

  // Clears search history from state and LocalStorage
  const clearRecent = () => {
    setRecent([])
    try {
      window.localStorage.removeItem(RECENT_KEY)
    } catch {
      /* storage unavailable */
    }
  }

  // Calculate navigable options count (product results + 1 for "See all results")
  const optionCount = debounced ? results.length + 1 : 0

  // Reset highlighted option index whenever search term changes
  useEffect(() => setActiveIndex(-1), [debounced])

  // Click outside listener: closes dropdown when clicking anywhere outside container
  useEffect(() => {
    if (fullScreen) return
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [fullScreen])

  // Auto-scroll the dropdown list to keep the currently active item in view during arrow navigation
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Navigate user to the full shop page with search query params
  const goToShop = () => {
    rememberSearch(debounced)
    setOpen(!!fullScreen)
    onNavigate?.()
    navigate({
      to: '/shop',
      search: { ...SHOP_DEFAULTS, search: debounced || undefined },
    })
  }

  // Navigate directly to a selected product's detail page
  const goToProduct = (slug:string) => {
    rememberSearch(debounced)
    setOpen(!!fullScreen)
    onNavigate?.()
    navigate({ to: '/products/$productId', params: { productId: slug } })
  }

  // Resolves navigation depending on option selected via keyboard or click
  const selectIndex = (i: number) => {
    if (i >= 0 && i < results.length) goToProduct(results[i].slug)
    else goToShop()
  }

  // Keyboard navigation handler (Arrow Up/Down, Home, End, Enter, Escape)
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (!fullScreen) setOpen(false)
      setActiveIndex(-1)
      onNavigate?.()
      return
    }
    if (!optionCount) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i + 1) % optionCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(optionCount - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectIndex(activeIndex)
    }
  }

  // View conditionals
  const showResults = open && !!debounced
  const showRecent = open && !debounced && recent.length > 0
  const showPanel = showResults || showRecent

  // Dropdown Suggestion / Recent Search Panel
  const panel = (
    <div
      className={cn(
        'overflow-hidden bg-popover',
        fullScreen
          ? 'mt-3 rounded-lg border border-border'
          : 'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-lg border border-border shadow-[var(--shadow-soft)]',
      )}
    >
      {/* SECTION 1: Recent Searches Panel */}
      {showRecent ? (
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow text-muted-foreground">
              Recent searches
            </span>
            <button
              type="button"
              onClick={clearRecent}
              className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                onClick={() => {
                  setQuery(r)
                  setDebounced(r)
                  setOpen(true)
                  inputRef.current?.focus()
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Clock className="h-3 w-3" />
                {r}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* SECTION 2: Search Results Dropdown List */
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            'overflow-y-auto py-1',
            fullScreen ? 'max-h-[70vh]' : 'max-h-80',
          )}
        >
          {pending && results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted-foreground">
              Searching…
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted-foreground">
              No pieces match “{debounced}”.
            </li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listboxId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={activeIndex === i}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                onClick={() => goToProduct(p.slug)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                  activeIndex === i && 'bg-secondary',
                )}
              >
                <img
                  src={p.images[0]}
                  alt=""
                  loading="lazy"
                  className="h-11 w-9 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    <Highlight text={p.name} term={debounced} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    <Highlight text={p.category.name} term={debounced} />
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatKes(p.price)}
                </span>
              </li>
            ))
          )}

          {/* Option to jump to full shop page */}
          <li
            id={`${listboxId}-opt-${results.length}`}
            data-index={results.length}
            role="option"
            aria-selected={activeIndex === results.length}
            onMouseEnter={() => setActiveIndex(results.length)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={goToShop}
            className={cn(
              'mt-1 cursor-pointer border-t border-border px-4 py-2.5 text-xs text-muted-foreground transition-colors',
              activeIndex === results.length
                ? 'bg-secondary text-foreground'
                : 'hover:text-foreground',
            )}
          >
            See all results for “{debounced}”
          </li>
        </ul>
      )}
    </div>
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          selectIndex(activeIndex)
        }}
        role="search"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search the atelier"
          className="w-full rounded-full border-border/80 bg-secondary/60 pl-9 pr-9"
          aria-label="Search products by name or category"
          role="combobox"
           aria-expanded={showPanel}
          aria-controls={showResults ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showResults && activeIndex >= 0
              ? `${listboxId}-opt-${activeIndex}`
              : undefined
          }
        />

        {/* Input End Controls: Loading Spinner / Clear Button */}
        {pending ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setDebounced('')
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {/* Screen Reader Live Region for dynamic accessibility updates */}
      <p className="sr-only" role="status" aria-live="polite">
        {showResults && !pending
          ? results.length === 0
            ? 'No results'
            : `${results.length} suggestion${results.length === 1 ? '' : 's'} available`
          : ''}
      </p>

      {/* Search Results / History Floating Panel */}
      {showPanel && panel}
    </div>
  )
}

/**
 * MobileSearchTrigger Component
 * Displays a search icon button on smaller screens that toggles a full-screen search modal overlay.
 */
export function MobileSearchTrigger({ className }: { className?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="flex flex-col bg-background p-0 md:hidden">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <GlobalSearch
            className="flex-1"
            autoFocus
            fullScreen
            onNavigate={() => {}}
          />
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </SheetTrigger>
        </div>
      </SheetContent>
    </Sheet>
  )
}
