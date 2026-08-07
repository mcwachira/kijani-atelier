
import type {
  CheckoutPayload,
  DashboardStats,
  Category,
  Message,
  MessageAuthor,
  MessageReply,
  Order,
  OrderStatus,
  Paginated,
  Product,
  ProductQueryParams,
  Review,
  SalesAnalytics,
  User,
} from '@/types'
import {  messages, orders, products, reviews } from './mock-data'



// Base URL for every API call. Falls back to localhost:8080 (our Docker
// Nginx port from Phase 0) if VITE_API_BASE_URL isn't set in .env.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

// Token storage: localStorage persists across page reloads/browser
// restarts (so the user stays logged in), while the module-level
// `authToken` variable avoids re-reading localStorage on every request.
// TRADE-OFF: localStorage is readable by any JS running on the page,
// including injected via XSS — this is the "bearer token vs cookie mode"
// trade-off discussed above, made concrete in actual code.
let authToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null



// Called right after login/register succeeds, and again on logout (with
// null) to clear the token. Every future apiFetch() call reads `authToken`
// from module state — this is the ONE place that state gets written.
export function setAuthToken(token:string |null){
  authToken = token

  // Same SSR guard as above — setAuthToken could theoretically run during
  // server-side code too, so never touch localStorage without checking.
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export function getAuthToken(){
  return authToken;
}


// A real Error subclass (not a plain object) so it works naturally with
// try/catch, error boundaries, and TanStack Query's built-in error typing.
// `errors` carries Laravel's field-level validation messages (e.g.
// { email: ["already taken"] }) for forms that need per-field feedback;
// `message` is always a plain string, safe to hand straight to toast.error().
export class ApiError extends Error {
  errors?: Record<string, string[]>
  status: number

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}


// The single function every API call goes through. Centralizing this means
// "attach the auth header," "parse JSON," and "turn failures into a
// consistent error shape" only need to be written once, not repeated in
// every individual endpoint function below.
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Accept: application/json is important — without it, Laravel may
    // respond with an HTML error page instead of JSON for certain errors,
    // which would break this function's response.json() call below.
    Accept: 'application/json',
    ...options.headers,
  }
  // Attach the bearer token to every authenticated request automatically —
  // callers of authApi.me(), authApi.logout(), etc. never have to
  // remember to add this header themselves.
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }


  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers})

  const data = await response.json();

  if (!response.ok) {
    // Laravel's error responses are shaped { message, errors? }. We
    // convert that JSON into a real ApiError so every caller handles
    // failures the same way, whether the failure was validation (422),
    // wrong credentials (422), or an unverified email blocking access (403)
    throw new ApiError(
      data.message ?? 'Something went Wrong. please Try again.',
      response.status,
      data.error,
    )
  }

  return data as T
}

// --- One function per endpoint. Each just calls apiFetch with the right
// path/method/body — all the shared logic (auth header, error handling)
// lives in apiFetch above, not repeated here. ---

export function register(data:{
  name:string
  email:string
  password:string
  password_confirmation:string
}){
  return apiFetch<{ message: string; user: User; token: string }>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}



export function login (data:{email:string; password:string}){
  return apiFetch<{user:User; token:string}>('/auth/login', {
    method:'POST',
    body:JSON.stringify(data),
  })
}

export function logout() {
  return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' })
}

export function me() {
  return apiFetch<User>('/auth/me')
}


export function forgotPassword(email:string){
  return apiFetch<{message:string}>('/auth/forgot-password', {
    method:"POST",
    body:JSON.stringify({email})
  })
}


// The verify link carries 4 pieces from the email: id, hash, expires,
// signature. All 4 must be forwarded to the backend exactly as received —
// this is what lets Laravel's `signed` middleware confirm the link is
// genuine and hasn't been tampered with or expired.
export function verifyEmail(params: {
  id: string
  hash: string
  expires: string
  signature: string
}) {
  const query = new URLSearchParams({
    expires: params.expires,
    signature: params.signature,
  })

  return apiFetch<{ message: string }>(
    `/auth/email/verify/${params.id}/${params.hash}?${query.toString()}`
  )
}

// Takes 4 separate arguments (not one object) purely because that's how
// the reset-password ROUTE currently calls it — matches its mutationFn
// signature: (password: string) => resetPassword(token, email, password, password)
export function resetPassword(
  token:string,
  email:string,
  password:string,
  passwordConfirmation:string
){
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  })
}

export function resendVerification() {
  return apiFetch<{ message: string }>('/auth/email/resend', { method: 'POST' })
}

// Grouped object too, since your register page already uses authApi.register
export const authApi = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  resendVerification,
  verifyEmail
}
export type CartLine = {
  product_id: number
  quantity: number
  size: string | null
}
/** Generic fetch helper used once the Laravel backend is wired up. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })
  if (!res.ok)
    throw new Error((await res.text()) || `Request failed: ${res.status}`)
  return (await res.json()) as T
}

const mock = <T>(value: T, delay = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), delay))

/* ---------------------------------- Catalog --------------------------------- */

// GET /products
// Maps directly onto ProductController::index()'s query params — category
// is a SLUG (not an id), material is a NAME, size is a VALUE, matching
// exactly what the backend's whereHas() filters expect.
export function getProducts(
  params: ProductQueryParams = {},
): Promise<Paginated<Product>> {

  const query = new URLSearchParams()
  if(params.search) query.set('search', params.search)
  if(params.category) query.set('category', params.category)
  if(params.material) query.set('material', params.material)
  if(params.size) query.set('size', params.size)
  if(params.min_price != null) query.set('min_price', String(params.min_price))
  if(params.max_price ) query.set('max_price', String(params.max_price))
  if(params.featured) query.set('is_new', 'true')
  if(params.sort) query.set('sort', params.sort)
  if(params.page) query.set('page', String(params.page))
  if(params.per_page) query.set('per_page', String(params.per_page))

  return apiFetch<Paginated<Product>>(`/products?${query.toString()}`);
}


// GET /products/{slug}
// The backend looks products up by SLUG, not numeric id — matches how
// product detail pages are routed. If you're calling this with a numeric
// id somewhere, that call site needs to pass the product's slug instead.
export function getProduct(slug: string): Promise<Product> {
  return apiFetch<Product>(`/products/${slug}`)
}


// GET /categories
export function getCategories(): Promise<Category[]> {
   return apiFetch<{data:Category[]}>('/categories').then((res) => res.data)

  }


// GET /categories/{slug}
export function getCategory(slug: string): Promise<Category> {
  return apiFetch<{ data: Category }>(`/categories/${slug}`).then((res) => res.data)
}


// GET /materials —  building material-filter checkboxes/facets on the catalog page.
export function getMaterials(): Promise<{ id: number; name: string }[]> {
  return apiFetch<{ data: { id: number; name: string }[] }>('/materials').then((res) => res.data)
}



// GET /sizes — same idea, for size-filter facets.
export function getSizes(): Promise<{ id: number; value: string }[]> {
  return apiFetch<{ data: { id: number; value: string }[] }>('/sizes').then((res) => res.data)
}

// --- Reviews: NOT a real backend endpoint yet — still mocked ---
// GET /products/{id}/reviews
export function getReviews(productId: number | string): Promise<Review[]> {
  return mock(reviews.filter((r) => r.product_id === Number(productId)))
  // Real implementation once the Reviews API is built:
  // return apiFetch<{ data: Review[] }>(`/products/${productId}/reviews`).then(res => res.data)
}
// POST /products/{id}/reviews
export function createReview(input: {
  product_id: number
  rating: number
  body: string
  author: string
}) {
  const review: Review = {
    id: Date.now(),
    product_id: input.product_id,
    author: input.author,
    rating: input.rating,
    body: input.body,
    created_at: new Date().toISOString().slice(0, 10),
  }
  reviews.unshift(review)
  return mock<Review>(review)
  // return request<Review>(`/products/${input.product_id}/reviews`, { method: "POST", body: JSON.stringify(input) });
}

/* ----------------------------------- Cart ----------------------------------- */
/** Cart is mirrored in localStorage by `useCart`; these calls sync it server-side. */

// POST /cart
export function addToCart(
  productId: number,
  quantity: number,
  size: string | null,
) {
  return mock({ ok: true, product_id: productId, quantity, size })
  // return request("/cart", { method: "POST", body: JSON.stringify({ product_id: productId, quantity, size }) });
}

// GET /cart
export function getCart(): Promise<{ items: CartLine[] }> {
  return mock({ items: [] as CartLine[] })
  // return request<{ items: CartLine[] }>("/cart");
}

// PATCH /cart/{itemId}
export function updateCartItem(itemId: string, quantity: number) {
  return mock({ ok: true, itemId, quantity })
  // return request(`/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
}

// DELETE /cart/{itemId}
export function removeCartItem(itemId: string) {
  return mock({ ok: true, itemId })
  // return request(`/cart/${itemId}`, { method: "DELETE" });
}

/* ---------------------------------- Orders ---------------------------------- */

// POST /orders
export function createOrder(payload: CheckoutPayload): Promise<Order> {
  const lines = payload.items.map((line) => {
    const product = products.find((p) => p.id === line.product_id)
    if (!product)
      throw new Error('One of the pieces in your order is no longer available.')
    return {
      product_name: product.name,
      quantity: line.quantity,
      price: product.price,
      size: line.size,
    }
  })
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const now = new Date().toISOString()
  const order: Order = {
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
    total: subtotal + (lines.length ? 350 : 0),
    items: lines,
    status_history: [
      {
        id: Date.now(),
        from: null,
        to: 'pending',
        note: 'Order placed by customer.',
        actor: 'System',
        created_at: now,
      },
    ],
    created_at: now,
  }
  orders.unshift(order)
  return mock<Order>(order, 900)
  // return request<Order>("/orders", { method: "POST", body: JSON.stringify(payload) });
}

// GET /orders/{reference}
export function getOrderByReference(reference: string): Promise<Order> {
  const found = orders.find((o) => o.reference === reference)
  if (!found) return Promise.reject(new Error('Order not found'))
  return mock(found)
  // return request<Order>(`/orders/${reference}`);
}

// GET /orders
export function getOrders(): Promise<Order[]> {
  return mock(orders)
  // return request<Order[]>("/orders");
}

/** Fulfilment rules — an order may only move forward, or be cancelled before dispatch. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

// PATCH /admin/orders/{id}/status
export function updateOrderStatus(input: {
  id: number
  status: OrderStatus
  note?: string
  actor?: string
}): Promise<Order> {
  const index = orders.findIndex((o) => o.id === input.id)
  if (index === -1) return Promise.reject(new Error('Order not found'))
  const current = orders[index]
  if (input.status === current.status)
    return Promise.reject(
      new Error(`This order is already marked ${current.status}.`),
    )
  if (!ORDER_TRANSITIONS[current.status].includes(input.status))
    return Promise.reject(
      new Error(
        `An order that is ${current.status} cannot move to ${input.status}.`,
      ),
    )

  const note = (input.note ?? '').trim()
  if (input.status === 'cancelled' && note.length < 5)
    return Promise.reject(
      new Error('A cancellation needs a note of at least 5 characters.'),
    )
  if (note.length > 280)
    return Promise.reject(new Error('Keep the note under 280 characters.'))

  const next: Order = {
    ...current,
    status: input.status,
    status_history: [
      ...current.status_history,
      {
        id: Date.now(),
        from: current.status,
        to: input.status,
        note: note || `Marked ${input.status}.`,
        actor: input.actor?.trim() || 'Admin',
        created_at: new Date().toISOString(),
      },
    ],
  }
  orders[index] = next
  return mock(next, 700)
  // return request<Order>(`/admin/orders/${input.id}/status`, { method: "PATCH", body: JSON.stringify(input) });
}



/* ---------------------------------- Admin ----------------------------------- */

// GET /admin/dashboard
export function getDashboardStats(): Promise<DashboardStats> {
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
  return mock({
    total_sales: 2_486_500,
    orders_count: orders.length * 12,
    customers_count: 486,
    average_order_value: 8_950,
    revenue_series: months.map((month, i) => ({
      month,
      revenue: 210_000 + i * 62_000 + (i % 2 ? 34_000 : 0),
      orders: 24 + i * 7,
    })),
    recent_orders: orders.slice(0, 6),
  })
  // return request<DashboardStats>("/admin/dashboard");
}

// GET /admin/analytics/sales
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
    by_month: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => ({
      month,
      revenue: 190_000 + i * 55_000,
    })),
    top_products: products.slice(0, 6).map((p, i) => ({
      name: p.name,
      units: 92 - i * 11,
      revenue: p.price * (92 - i * 11),
    })),
  })
  // return request<SalesAnalytics>(`/admin/analytics/sales?${new URLSearchParams(filters as never)}`);
}

/* --------------------------------- Messaging -------------------------------- */

// GET /admin/messages
export function getMessages(): Promise<Message[]> {
  return mock([...messages])
  // return request<Message[]>("/admin/messages");
}

// GET /messages?email=
export function getCustomerMessages(email: string): Promise<Message[]> {
  const mine = messages.filter(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
  )
  return mock(mine)
  // return request<Message[]>(`/messages?email=${encodeURIComponent(email)}`);
}

// POST /messages
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

// POST /messages/{id}/replies
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
  const index = messages.findIndex((m) => m.id === id)
  if (index === -1) return Promise.reject(new Error('Conversation not found'))
  messages[index] = { ...messages[index], unread: false }
  return mock(messages[index], 150)
  // return request<Message>(`/admin/messages/${id}/read`, { method: "PATCH" });
}

/* ------------------------------ Admin: catalog ------------------------------ */



export interface CategoryInput {
  name: string
  slug: string
  description?: string
  image?: string
}


// POST /categories
export function createCategory(input: CategoryInput): Promise<Category> {
  return apiFetch<{ data: Category }>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

// PUT /categories/{category}  — {category} is the numeric id here, NOT the
// slug. Public reads use slug (GET /categories/{slug}), but admin writes
// use the route-model-bound numeric id, matching CategoryController::update.
export function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  return apiFetch<{ data: Category }>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

// DELETE /categories/{category}
// IMPORTANT BEHAVIOR CHANGE from the old mock: the backend CASCADES this
// delete — every product in this category is deleted too (see the
// products table's cascadeOnDelete on category_id). The old mock used to
// block deletion if products existed; the real API does not. The
// AdminCategories confirmation dialog copy below has been updated to
// reflect this — don't revert that wording without also changing the
// backend's delete behavior.
export function deleteCategory(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/categories/${id}`, { method: 'DELETE' })
}



// Matches StoreProductRequest/UpdateProductRequest exactly — notably
// category_id (a number), NOT a category slug like the old mock used.
// materials/sizes are optional arrays of EXISTING material/size ids.
export interface ProductInput {
  name: string
  price: number
  stock: number
  category_id: number
  description?: string
  materials?: number[]
  sizes?: number[]
}

// POST /products
export function createProduct(input: ProductInput): Promise<Product> {
  return apiFetch<{ data: Product }>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

// PUT /products/{product} — partial update; only send fields that changed.
export function updateProduct(id: number, input: Partial<ProductInput>): Promise<Product> {
  return apiFetch<{ data: Product }>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

// DELETE /products/{product}
export function deleteProduct(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' })
}

/* ------------------------------ Account access ------------------------------ */

export interface AuthMessage {
  message: string
}



/* --------------------------------- Wishlist --------------------------------- */

export interface WishlistLine {
  product_id: number
  size: string | null
  added_at: string
}

// GET /wishlist
export function getWishlist(): Promise<WishlistLine[]> {
  return mock<WishlistLine[]>([], 250)
  // return request<WishlistLine[]>("/wishlist");
}

// POST /wishlist/sync — merges the guest wishlist into the signed-in account.
export function syncWishlist(lines: WishlistLine[]): Promise<WishlistLine[]> {
  return mock(lines, 500)
  // return request("/wishlist/sync", { method: "POST", body: JSON.stringify({ items: lines }) });
}
