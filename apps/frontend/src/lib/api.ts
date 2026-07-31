import type {
  CheckoutPayload,
  DashboardStats,
  Category,
  Message,
  MessageAuthor,
  MessageReply,
  Order,
  OrderItem,
  OrderStatus,
  Paginated,
  Product,
  ProductQueryParams,
  Review,
  SalesAnalytics,
  User,
} from '@/types'

/**
 * --------------------------------------------------------------------------
 * MOCK DATA
 * --------------------------------------------------------------------------
 * Local static data used to simulate backend responses.
 * This allows frontend development without a real API.
 */
import { categories, messages, orders, products, reviews } from './mock-data'

/**
 * --------------------------------------------------------------------------
 * BASE API URL
 * --------------------------------------------------------------------------
 * This will be used when switching from mock → real Laravel backend.
 * ⚠️ Should be: http://127.0.0.1:8000/api
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

/**
 * --------------------------------------------------------------------------
 * GENERIC REQUEST HELPER
 * --------------------------------------------------------------------------
 * Used when connecting to Laravel API.
 * Wraps fetch() with:
 * - JSON headers
 * - Error handling
 * - Type safety
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Needed for Laravel Sanctum (cookie-based auth)
    ...init,
  })

  // Handle HTTP errors
  if (!res.ok) {
    throw new Error((await res.text()) || `Request failed: ${res.status}`)
  }

  return (await res.json()) as T
}

/**
 * --------------------------------------------------------------------------
 * MOCK HELPER
 * --------------------------------------------------------------------------
 * Simulates API delay to test loading states in UI.
 */
const mock = <T>(value: T, delay = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), delay))

/* -------------------------------------------------------------------------- */
/*                                PRODUCTS API                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /products
 * Fetch products with filters, sorting, and pagination.
 */
export function getProducts(
  params: ProductQueryParams = {},
): Promise<Paginated<Product>> {
  const perPage = params.per_page ?? 9
  let list = [...products] // clone products array

  /**
   * SEARCH FILTER
   * Matches product name or category name
   */
  if (params.search) {
    const q = params.search.toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q),
    )
  }

  /**
   * CATEGORY FILTER
   */
  if (params.category) {
    list = list.filter((p) => p.category.slug === params.category)
  }

  /**
   * PRICE FILTERS
   */
  if (params.min_price != null) {
    list = list.filter((p) => p.price >= params.min_price!)
  }

  if (params.max_price != null) {
    list = list.filter((p) => p.price <= params.max_price!)
  }

  /**
   * SIZE FILTER
   */
  if (params.size) {
    list = list.filter((p) => p.sizes.includes(params.size!))
  }

  /**
   * MATERIAL FILTER
   */
  if (params.material) {
    list = list.filter((p) => p.materials.includes(params.material!))
  }

  /**
   * FEATURED PRODUCTS
   */
  if (params.featured) {
    list = list.filter((p) => p.is_new)
  }

  /**
   * SORTING
   */
  if (params.sort === 'price_asc') {
    list.sort((a, b) => a.price - b.price)
  } else if (params.sort === 'price_desc') {
    list.sort((a, b) => b.price - a.price)
  } else if (params.sort === 'newest') {
    list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  }

  /**
   * PAGINATION
   */
  const page = params.page ?? 1
  const total = list.length

  return mock({
    data: list.slice((page - 1) * perPage, page * perPage),
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
    },
  })
}

/**
 * GET /products/{id}
 * Fetch a single product by ID
 */
export function getProduct(id: number | string): Promise<Product> {
  const found = products.find((product) => product.id === Number(id))

  if (!found) {
    return Promise.reject(new Error('Product not found'))
  }

  return mock(found)
}

/**
 * GET /categories
 */
export function getCategories(): Promise<Category[]> {
  return mock(categories)
}

/**
 * GET /products/{id}/reviews
 */
export function getReviews(productId: number | string): Promise<Review[]> {
  return mock(
    reviews.filter((review) => review.product_id == Number(productId)),
  )
}

/**
 * POST /products/{id}/reviews
 * Create a new review
 */
export function createReview(input: {
  product_id: number
  rating: number
  body: string
  author: string
}) {
  return mock<Review>({
    id: Date.now(),
    product_id: input.product_id,
    author: input.author,
    rating: input.rating,
    body: input.body,
    created_at: new Date().toISOString().slice(0, 10),
  })
}

/* -------------------------------------------------------------------------- */
/*                                   ORDERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /orders
 * Create new order from checkout payload
 */
export function createOrder(payload: CheckoutPayload): Promise<Order> {
  const items: OrderItem[] = payload.items.map((item) => {
    const product = products.find((p) => p.id === item.product_id)
    return {
      product_name: product?.name ?? `Product #${item.product_id}`,
      quantity: item.quantity,
      price: product?.price ?? 0,
      size: item.size,
    }
  })

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return mock<Order>(
    {
      id: Date.now(),
      reference: `KJ-${Math.floor(1000 + Math.random() * 8999)}`,
      customer_name: payload.name,
      email: payload.email,
      phone: payload.phone,
      county: payload.county,
      town: payload.town,
      address: payload.address,
      payment_method: payload.payment_method,
      status: 'pending',
      total,
      items,
      created_at: new Date().toISOString(),
    },
    900,
  )
}

/**
 * GET /orders
 */
export function getOrders(): Promise<Order[]> {
  return mock(orders)
}

/**
 * GET /orders/{reference}
 */
export function getOrder(reference: string): Promise<Order> {
  const found = orders.find((o) => o.reference === reference)
  if (!found) return Promise.reject(new Error('Order not found'))
  return mock(found)
}

/* -------------------------------------------------------------------------- */
/*                                   AUTH                                     */
/* -------------------------------------------------------------------------- */

/**
 * POST /login
 * Returns mock user + token
 */
export function login(credentials: {
  email: string
  password: string
}): Promise<{ user: User; token: string }> {
  return mock(
    {
      user: {
        id: 1,
        name: 'Wanjiru Kamau',
        email: credentials.email,
        role: 'customer' as const,
      },
      token: 'mock-token',
    },
    700,
  )
}

/**
 * POST /register
 */
export function register(input: {
  name: string
  email: string
  password: string
}): Promise<{ user: User; token: string }> {
  return mock(
    {
      user: {
        id: 2,
        name: input.name,
        email: input.email,
        role: 'customer' as const,
      },
      token: 'mock-token',
    },
    700,
  )
}

/**
 * GET /user
 * Returns current authenticated user
 */
export function getUser(): Promise<User | null> {
  return mock<User | null>(null, 150)
}


/* -------------------------------------------------------------------------- */
/*                                   ADMIN                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/dashboard
 * Dashboard summary stats
 */
export function getDashboardStats(): Promise<DashboardStats> {
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

  return mock({
    total_sales: 2_486_500,
    orders_count: orders.length * 12,
    customers_count: 486,
    average_order_value: 8_950,

    /**
     * Revenue trend data
     */
    revenue_series: months.map((month, i) => ({
      month,
      revenue: 210_000 + i * 62_000 + (i % 2 ? 34_000 : 0),
      orders: 24 + i * 7,
    })),

    /**
     * Recent orders preview
     */
    recent_orders: orders.slice(0, 6),
  })
}

/**
 * GET /admin/analytics/sales
 * Sales analytics data
 */
export function getSalesAnalytics(
  filters: { from?: string; to?: string; region?: string } = {},
): Promise<SalesAnalytics> {
  const regions = [
    'Nairobi',
    'Mombasa',
    'Kisumu',
    'Nakuru',
    'Kiambu',
    'Machakos',
    'Eldoret',
  ]

  const by_region = regions.map((region, i) => ({
    region,
    sales: 420_000 - i * 48_000,
    orders: 128 - i * 14,
  }))

  return mock({
    by_region: filters.region
      ? by_region.filter((r) => r.region === filters.region)
      : by_region,

    /**
     * Monthly revenue
     */
    by_month: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => ({
      month,
      revenue: 190_000 + i * 55_000,
    })),

    /**
     * Top selling products
     */
    top_products: products.slice(0, 6).map((p, i) => ({
      name: p.name,
      units: 92 - i * 11,
      revenue: p.price * (92 - i * 11),
    })),
  })
}


/* -------------------------------------------------------------------------- */
/*                                   MESSAGING                                 */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/messages
 */
export function getMessages(): Promise<Message[]> {
  return mock([...messages])
  // return request<Message[]>("/admin/messages");
}

/**
 * GET /messages?email=
 */
export function getCustomerMessages(email: string): Promise<Message[]> {
  const mine = messages.filter(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
  )
  return mock(mine)
  // return request<Message[]>("/admin/messages");
}

/**
 * Post /messages
 */

export function createMessage(input: {
  name: string
  email: string
  subject: string
  body: string
}): Promise<Message> {
  const name = input.name.trim()
  const email = input.email.trim()
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (name.length < 2)
    return Promise.reject(new Error('Please tell us your name.'))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Promise.reject(new Error("That email doesn't look right."))
  if (subject.length < 3)
    return Promise.reject(new Error('Add a short subject.'))
  if (body.length < 10)
    return Promise.reject(
      new Error('Tell us a little more (10 characters minimum).'),
    )
  if (body.length > 1000)
    return Promise.reject(
      new Error('Please keep your message under 1000 characters.'),
    )

  const message: Message = {
    id: Math.max(0, ...messages.map((m) => m.id)) + 1,
    name,
    email,
    subject,
    preview: body.slice(0, 90),
    body,
    unread: true,
    replies: [],
    created_at: new Date().toISOString(),
  }
  messages.unshift(message)
  return mock(message, 600)
  // return request<Message>("/messages", { method: "POST", body: JSON.stringify(input) });
}

/**
 *  POST /messages/{id}/replies
 */

export function replyToMessage(input: {
  id: number
  body: string
  author: MessageAuthor
  author_name?: string
}): Promise<Message> {
  const index = messages.findIndex((m) => m.id === input.id)
  if (index === -1) return Promise.reject(new Error('Conversation not found'))
  const body = input.body.trim()
  if (body.length < 2)
    return Promise.reject(new Error('Write a reply before sending.'))
  if (body.length > 1000)
    return Promise.reject(
      new Error('Please keep the reply under 1000 characters.'),
    )

  const reply: MessageReply = {
    id: Date.now(),
    author: input.author,
    author_name:
      input.author_name?.trim() ||
      (input.author === 'admin' ? 'Kijani Atelier' : messages[index].name),
    body,
    created_at: new Date().toISOString(),
  }
  const next: Message = {
    ...messages[index],
    replies: [...messages[index].replies, reply],
    unread: input.author === 'customer',
  }
  messages[index] = next
  return mock(next, 600)
  // return request<Message>(`/messages/${input.id}/replies`, { method: "POST", body: JSON.stringify(input) });
}

// PATCH /admin/messages/{id}/read
export function markMessageRead(id: number): Promise<Message> {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return Promise.reject(new Error("Conversation not found"));
  messages[index] = { ...messages[index], unread: false };
  return mock(messages[index], 150);
  // return request<Message>(`/admin/messages/${id}/read`, { method: "PATCH" });
}


/* ------------------------------ Admin: catalog ------------------------------ */

export interface ProductInput {
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// POST /admin/products
export function createProduct(input: ProductInput): Promise<Product> {
  const category = categories.find((c) => c.slug === input.category);
  if (!category) return Promise.reject(new Error("Unknown category"));
  const product: Product = {
    id: Math.max(0, ...products.map((p) => p.id)) + 1,
    name: input.name,
    slug: slugify(input.name),
    price: input.price,
    compare_at_price: null,
    category,
    description: input.description,
    craft_note: "Handmade in small batches by our artisan partners.",
    materials: ["leather"],
    sizes: [],
    images: [category.image, category.image, category.image],
    stock: input.stock,
    rating: 0,
    reviews_count: 0,
    is_new: true,
    created_at: new Date().toISOString(),
  };
  products.unshift(product);
  category.products_count += 1;
  return mock(product, 600);
  // return request<Product>("/admin/products", { method: "POST", body: JSON.stringify(input) });
}

// PUT /admin/products/{id}
export function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const index = products.findIndex((p) => p.id === id);
  const category = categories.find((c) => c.slug === input.category);
  if (index === -1 || !category) return Promise.reject(new Error("Product not found"));
  const next: Product = {
    ...products[index],
    name: input.name,
    slug: slugify(input.name),
    price: input.price,
    stock: input.stock,
    description: input.description,
    category,
  };
  products[index] = next;
  return mock(next, 600);
  // return request<Product>(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

// DELETE /admin/products/{id}
export function deleteProduct(id: number): Promise<{ id: number }> {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return Promise.reject(new Error("Product not found"));
  products.splice(index, 1);
  return mock({ id }, 500);
  // return request(`/admin/products/${id}`, { method: "DELETE" });
}

// POST /admin/categories
export function createCategory(input: CategoryInput): Promise<Category> {
  const slug = slugify(input.slug || input.name);
  if (categories.some((c) => c.slug === slug)) return Promise.reject(new Error("A category with that slug already exists"));
  const category: Category = {
    id: Math.max(0, ...categories.map((c) => c.id)) + 1,
    name: input.name,
    slug,
    description: input.description || "A new collection.",
    image: categories[0]?.image ?? "",
    products_count: 0,
  };
  categories.push(category);
  return mock(category, 600);
  // return request<Category>("/admin/categories", { method: "POST", body: JSON.stringify(input) });
}

// PUT /admin/categories/{id}
export function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return Promise.reject(new Error("Category not found"));
  const slug = slugify(input.slug || input.name);
  if (categories.some((c) => c.slug === slug && c.id !== id))
    return Promise.reject(new Error("A category with that slug already exists"));
  const next: Category = {
    ...categories[index],
    name: input.name,
    slug,
    description: input.description || categories[index].description,
  };
  categories[index] = next;
  return mock(next, 600);
  // return request<Category>(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

// DELETE /admin/categories/{id}
export function deleteCategory(id: number): Promise<{ id: number }> {
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return Promise.reject(new Error("Category not found"));
  if (products.some((p) => p.category.id === id))
    return Promise.reject(new Error("Remove the products in this collection first"));
  categories.splice(index, 1);
  return mock({ id }, 500);
  // return request(`/admin/categories/${id}`, { method: "DELETE" });
}

/* ------------------------------ Account access ------------------------------ */

export interface AuthMessage {
  message: string;
}

// POST /forgot-password
export function forgotPassword(email: string): Promise<AuthMessage> {
  return mock({ message: `If an account exists for ${email}, a reset link is on its way.` }, 700);
  // return request("/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

// POST /reset-password
export function resetPassword(token: string, password: string): Promise<AuthMessage> {
  if (!token) return Promise.reject(new Error("This reset link is invalid or has expired."));
  return mock({ message: "Your password has been updated. You can sign in now." }, 700);
  // return request("/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}

// POST /email/verify
export function verifyEmail(token?: string): Promise<AuthMessage> {
  if (!token) return Promise.reject(new Error("This verification link is invalid or has expired."));
  return mock({ message: "Your email address has been verified." }, 700);
  // return request("/email/verify", { method: "POST", body: JSON.stringify({ token }) });
}

// POST /email/verification-notification
export function resendVerification(email?: string): Promise<AuthMessage> {
  return mock({ message: email ? `Verification email sent to ${email}.` : "Verification email sent." }, 700);
  // return request("/email/verification-notification", { method: "POST", body: JSON.stringify({ email }) });
}

/* --------------------------------- Wishlist --------------------------------- */

export interface WishlistLine {
  product_id: number;
  size: string | null;
  added_at: string;
}

// GET /wishlist
export function getWishlist(): Promise<WishlistLine[]> {
  return mock<WishlistLine[]>([], 250);
  // return request<WishlistLine[]>("/wishlist");
}

// POST /wishlist/sync — merges the guest wishlist into the signed-in account.
export function syncWishlist(lines: WishlistLine[]): Promise<WishlistLine[]> {
  return mock(lines, 500);
  // return request("/wishlist/sync", { method: "POST", body: JSON.stringify({ items: lines }) });
}
