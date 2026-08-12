import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, Menu, Search, ShoppingBag, User, LogOut, Package, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWishlist } from '@/hooks/use-whishlist'
import { useCart } from '@/hooks/use-cart'
import { useAuth } from '@/hooks/use-auth'
import { logout as logoutApi } from '@/lib/api'
import { formatKes } from '@/lib/format'
import { GlobalSearch } from '../GlobalSearch.tsx'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop', search: { category: 'sandals' }, label: 'Sandals' },
  { to: '/shop', search: { category: 'kiondos' }, label: 'Kiondos' },
  { to: '/shop', search: { category: 'handbags' }, label: 'Handbags' },
  { to: '/about', label: 'Our Story' },
]

function MiniCart({ onClose }: { onClose: () => void }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart()

  return (
    <SheetContent side="right" className="flex w-96 flex-col">
      <SheetHeader>
        <SheetTitle className="font-display text-xl">Your bag</SheetTitle>
      </SheetHeader>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Your bag is empty.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex-1 space-y-5 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="h-20 w-16 shrink-0 rounded-md object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {item.size && <p className="text-xs text-muted-foreground">Size {item.size}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-xs">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-medium">{formatKes(item.line_total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatKes(subtotal)}</span>
            </div>
            <Button asChild size="lg" className="mt-4 w-full" onClick={onClose}>
              <Link to="/cart">View bag</Link>
            </Button>
          </div>
        </>
      )}
    </SheetContent>
  )
}

export function Navbar() {
  const { count } = useWishlist()
  const { items: cartItems } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // still clear local state even if the server-side revoke fails
    }
    logout()
    navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">Kijani Atelier</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    search={link.search}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-8 border-t border-border pt-6">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-1">
                    <p className="px-3 text-xs text-muted-foreground">Signed in as {user?.name}</p>
                    <Link
                      to="/orders"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                    >
                      My orders
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false)
                        void handleLogout()
                      }}
                      className="rounded-md px-3 py-2.5 text-left text-sm hover:bg-secondary"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="font-display text-xl tracking-tight">
            Kijani Atelier
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                search={link.search}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Wishlist">
            <Link to="/wishlist">
              <Heart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {/* Cart icon opens a slide-out mini-cart, matching the mobile
              menu's Sheet pattern — click "View bag" inside for the full
              /cart page. */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <MiniCart onClose={() => setCartOpen(false)} />
          </Sheet>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> My orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleLogout()} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild aria-label="Sign in">
              <Link to="/login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}