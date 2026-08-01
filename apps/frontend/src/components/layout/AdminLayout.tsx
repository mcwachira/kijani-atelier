import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  MessagesSquare,
  Receipt,
  Store,
  Tags,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Boxes },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/analytics', label: 'Sales analytics', icon: BarChart3 },
  { to: '/admin/messages', label: 'Messages', icon: MessagesSquare },
]

export function AdminLayout({title, description, children}:{title:string; description:string; children:ReactNode}){

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background lg:flex">
    <aside className="border-b border-border bg-sidebar text-sidebar-foreground lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between px-5 py-5">
    <Link to="/" className="font-display text-xl">
    Kijani <span className="eyebrow">Admin</span>
    </Link>
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour mode">
  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  </Button>
  </div>
  <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
    {nav.map((item) => (
        <Link
          key={item.to}
      to={item.to}
      activeOptions={{ exact: item.to === "/admin" }}
  activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
  className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  >
  <item.icon className="h-4 w-4 shrink-0" />
    {item.label}
    </Link>
))}
  <Link
    to="/"
  className="mt-2 flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
  >
  <Store className="h-4 w-4 shrink-0" />
    Back to store
  </Link>
  </nav>
  </aside>

  <div className="min-w-0 flex-1">
  <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
  <header className="mb-8">
  <h1 className="font-display text-3xl lg:text-4xl">{title}</h1>
    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </header>
  {children}
  </div>
  </div>
  </div>
);
}
