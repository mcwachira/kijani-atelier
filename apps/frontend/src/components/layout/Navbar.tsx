import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, Menu, Search, User, LogOut, Package } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth'
import { logout as logoutApi } from '@/lib/api'
import { GlobalSearch } from '../GlobalSearch.tsx'

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop', search: { category: 'sandals' }, label: 'Sandals' },
  { to: '/shop', search: { category: 'kiondos' }, label: 'Kiondos' },
  { to: '/shop', search: { category: 'handbags' }, label: 'Handbags' },
  { to: '/about', label: 'Our Story' },
]

export function Navbar() {
  const { count } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      // Tells the backend to revoke this specific token — see
      // AuthController::logout(), which deletes only the CURRENT
      // token, not every device the user's logged in on.
      await logoutApi()
    } catch {
      // Even if the API call fails (token already expired, network
      // hiccup), still clear local state so the UI reflects "logged
      // out" regardless — a failed server-side revoke shouldn't trap
      // the user in a broken logged-in-looking state.
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">
                  Kijani Atelier
                </SheetTitle>
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
                    <p className="px-3 text-xs text-muted-foreground">
                      Signed in as {user?.name}
                    </p>
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative"
            aria-label="Wishlist"
          >
            <Link to="/wishlist">
              <Heart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {/* Auth-aware account icon — a dropdown when signed in (name,
              orders, sign out), a plain link to /login when signed out.
              Using a DropdownMenu here rather than a second Sheet keeps
              this lightweight for a single small menu. */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">
                  {user?.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> My orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-2"
                >
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
