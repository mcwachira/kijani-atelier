import { Link } from '@tanstack/react-router'
import { Moon, ShoppingBag, Sun, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/GlobalSearch'
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
import { useTheme } from '@/hooks/use-theme'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop', label: 'Sandals', search: { category: 'sandals' } },
  { to: '/shop', label: 'Kiondos', search: { category: 'kiondos' } },
  { to: '/shop', label: 'Handbags', search: { category: 'handbags' } },
]
