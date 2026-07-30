import { Link, linkOptions } from '@tanstack/react-router'
import { Heart, Moon, ShoppingBag, Sun, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlobalSearch, MobileSearchTrigger } from '@/components/GlobalSearch'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCart } from '@/hooks/use-cart'
import { useWishlist } from '@/hooks/use-whishlist.tsx'
import { useTheme } from '@/hooks/use-theme'

const links = linkOptions([
  { to: '/shop', label: 'Shop', search: {} },
  { to: '/shop', label: 'Sandals', search: { category: 'sandals' } },
  { to: '/shop', label: 'Kiondos', search: { category: 'kiondos' } },
  { to: '/shop', label: 'Handbags', search: { category: 'handbags' } },
])

export function Navbar() {
  const { count } = useCart()
  const { count: savedCount } = useWishlist()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Sheet>
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
          <SheetContent side="left" className="w-72 p-6">
            <div className="mt-8">
              <GlobalSearch />
            </div>
            <nav className="mt-6 flex flex-col gap-5">
              {links.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  search={l.search}
                  className="font-display text-2xl text-foreground"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/wishlist"
                className="font-display text-2xl text-foreground"
              >
                Wishlist
              </Link>
              <Link
                to="/messages"
                className="font-display text-2xl text-foreground"
              >
                Messages
              </Link>
              <Link to="/admin" className="eyebrow pt-4">
                Admin dashboard
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0">
          <span className="font-display text-2xl tracking-tight lg:text-[1.75rem]">
            Kijani
          </span>
          <span className="eyebrow ml-2 hidden sm:inline">Atelier</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              search={l.search}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <GlobalSearch className="hidden w-44 md:block lg:w-60" />
          <MobileSearchTrigger className="md:hidden" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle colour mode"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login">Sign in</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/register">Create account</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/wishlist">Wishlist</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/messages">Messages</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin">Admin dashboard</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label={`Wishlist, ${savedCount} saved`}
          >
            <Link to="/wishlist" className="relative">
              <Heart className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                  {savedCount}
                </span>
              )}
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
            <Link to="/cart" className="relative">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
