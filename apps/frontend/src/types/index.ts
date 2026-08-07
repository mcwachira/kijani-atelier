// Material used to be a fixed union (leather | woven | beads | brass),
// which matched the old mock data exactly. It's now a real, admin-
// editable table (MaterialController lets admins add new ones — see
// admin.categories-style CRUD), so a hardcoded union would silently break
// the moment someone adds a material through the admin UI that isn't in
// this list (e.g. "raffia", which is actually in your seeded data).
// Plain `string` matches the backend's actual behavior: any material name
// is valid, the set is open-ended and DB-driven, not compile-time-fixed.
export type Material = string

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  image: string
  products_count: number
}

export interface Review {
  id: number
  product_id: number
  author: string
  rating: number
  body: string
  created_at: string
}

export interface Product {
  id: number
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  category: Category
  description: string
  craft_note: string
  materials: Material[] // now string[] under the hood, since Material = string
  sizes: string[]
  images: string[]
  stock: number
  rating: number
  reviews_count: number
  is_new: boolean
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    // Laravel's real paginator also includes from/to/path/links — not
    // typed here since nothing currently reads them, but they DO exist
    // on the real response if you need them later. TypeScript won't
    // complain about the extra untyped fields being present at runtime.
  }
}

export interface ProductQueryParams {
  search?: string
  category?: string
  min_price?: number
  max_price?: number
  size?: string
  material?: Material // now effectively `string` — see Material above
  sort?: 'newest' | 'price_asc' | 'price_desc'
  page?: number
  per_page?: number
  featured?: boolean
}

export interface CartItem {
  id: string
  product: Product
  quantity: number
  size: string | null
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: 'customer' | 'admin'
  email_verified_at: string | null
  created_at: string
}

export interface OrderItem {
  product_name: string
  quantity: number
  price: number
  size: string | null
}

export type OrderStatus =
  'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderStatusEvent {
  id: number
  from: OrderStatus | null
  to: OrderStatus
  note: string
  actor: string
  created_at: string
}

export interface Order {
  id: number
  reference: string
  customer_name: string
  email: string
  phone: string
  county: string
  town: string
  address: string
  payment_method: 'mpesa' | 'card'
  status: OrderStatus
  total: number
  items: OrderItem[]
  status_history: OrderStatusEvent[]
  created_at: string
}

export interface CheckoutPayload {
  name: string
  email: string
  phone: string
  address: string
  county: string
  town: string
  payment_method: 'mpesa' | 'card'
  items: { product_id: number; quantity: number; size: string | null }[]
}

export interface DashboardStats {
  total_sales: number
  orders_count: number
  customers_count: number
  average_order_value: number
  revenue_series: { month: string; revenue: number; orders: number }[]
  recent_orders: Order[]
}

export interface SalesAnalytics {
  by_region: { region: string; sales: number; orders: number }[]
  by_month: { month: string; revenue: number }[]
  top_products: { name: string; units: number; revenue: number }[]
}

export type MessageAuthor = 'customer' | 'admin'

export interface MessageReply {
  id: number
  author: MessageAuthor
  author_name: string
  body: string
  created_at: string
}

export interface Message {
  id: number
  name: string
  email: string
  subject: string
  preview: string
  body: string
  unread: boolean
  replies: MessageReply[]
  created_at: string
}
