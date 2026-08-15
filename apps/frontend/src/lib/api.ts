
import type {
  CheckoutPayload,
  DashboardStats,
  Category,
  Message,
  Order,
  OrderStatus,
  Paginated,
  Product,
  ProductQueryParams,
  Review,
  SalesAnalytics,
  User,
  PaymentStatus,
  RawPaginated,
  AdminCustomer,
} from '@/types'
import { getOrCreateCartToken } from '@/lib/cart-token'



// Frontend-only UX guardrail — PATCH /admin/orders/{order}/status accepts
// ANY status value (see UpdateOrderStatusRequest: just `in:pending,paid,
// shipped,delivered,cancelled`, no transition logic server-side). This
// constant exists purely so the admin dialog only offers sensible next
// steps, not because the API itself enforces any ordering.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}


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
    ...(options.headers as Record<string, string>),
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
      data.errors,
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

// const mock = <T>(value: T, delay = 350): Promise<T> =>
//   new Promise((resolve) => setTimeout(() => resolve(value), delay))

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
  return apiFetch<{ data: Product }>(`/products/${slug}`).then(
    (res) => res.data,
  )
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



// Sent on every cart/checkout request. Harmless when logged in — the
// backend's resolveCart() ignores this header entirely once it resolves
// a real authenticated user, so there's no need to conditionally omit it.
function cartHeaders(): HeadersInit {
  return { 'X-Cart-Token': getOrCreateCartToken() }
}
/* ----------------------------------- Cart ----------------------------------- */
/** Cart is mirrored in localStorage by `useCart`; these calls sync it server-side. */

export interface CartItemApi {
  id:number
  quantity:number
  size:string | null
  line_total:number
  product:Product
}

export interface CartApi {
  id:number | null
  items:CartItemApi[]
  subtotal:number
}

// Get /cart
export function getCart():Promise<CartApi>
{
  return apiFetch<{ data: CartApi }>('/cart', { headers: cartHeaders() }).then(
    (res) => res.data,
  )
}


// POST /Cart
export function addToCart(
    productId:number,
    quantity=1,
    size:string |null = null

):Promise<CartApi>{
  return apiFetch<{data:CartApi}>('/cart',{
    method: 'POST',
    headers: cartHeaders(),
    body: JSON.stringify({ product_id: productId, quantity, size }),
  }).then((res) => res.data)
}

// PUT /cart/{cartItem}
export function updateCartItem(itemId: number, quantity: number): Promise<CartApi> {
  return apiFetch<{ data: CartApi }>(`/cart/${itemId}`, {
    method: 'PUT',
    headers: cartHeaders(),
    body: JSON.stringify({ quantity }),
  }).then((res) => res.data)
}

// DELETE /cart/{cartItem}
export function removeCartItem(itemId: number): Promise<CartApi> {
  return apiFetch<{ data: CartApi }>(`/cart/${itemId}`, {
    method: 'DELETE',
    headers: cartHeaders(),
  }).then((res) => res.data)
}

// POST /cart/merge — call right after login/register succeeds, passing
// whatever guest cart token was accumulated via X-Cart-Token. Requires
// auth:sanctum on the backend, so authToken must already be set (via
// setAuthToken) BEFORE this is called.
export function mergeCart(): Promise<CartApi> {
  return apiFetch<{ data: CartApi }>('/cart/merge', {
    method: 'POST',
    headers: cartHeaders(),
  }).then((res) => res.data)
}


/* --------------------------------- Payments --------------------------------- */

// POST /payments/mpesa/initiate — triggers the STK push. Returns a
// payment_id used to poll status below, since confirmation arrives
// asynchronously via M-Pesa's callback, not in this response.

export function initiateMpesaPayment(input: {
  order_reference: string
  phone: string
}): Promise<{ message: string; payment_id: number }> {
  return apiFetch('/payments/mpesa/initiate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// POST /payments/card/initiate — returns a Paystack-hosted checkout URL.
// Redirect the browser there; Paystack collects card details itself, so
// no card data ever touches this frontend or your backend directly.

export function initiatePaystackPayment(input: {
  order_reference: string
  email: string
}): Promise<{
  authorization_url: string
  reference: string
  payment_id: number
}> {
  return apiFetch('/payments/card/initiate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}


// GET /payments/{paymentId}/status — poll this after initiating M-Pesa
// (or as a fallback after returning from Paystack's redirect) until
// status moves off 'pending'.
export function getPaymentStatus(paymentId: number): Promise<PaymentStatus> {
  return apiFetch(`/payments/${paymentId}/status`)
}

// GET /payments/card/verify/{reference} — direct verification, used when
// the customer returns from Paystack's checkout page. Confirms status
// immediately rather than waiting for the async webhook.
export function verifyPaystackPayment(reference: string): Promise<PaymentStatus> {
  return apiFetch(`/payments/card/verify/${reference}`)
}


/* ---------------------------------- Orders ---------------------------------- */

// POST /orders — guest checkout allowed. X-Cart-Token is sent so the
// backend clears the RIGHT cart (guest or logged-in) after the order
// completes — see OrderController::store's cart-clearing logic.

export function createOrder(payload: CheckoutPayload): Promise<Order> {
  return apiFetch<{ data: Order }>('/orders', {
    method: 'POST',
    headers: cartHeaders(),
    body: JSON.stringify(payload),
  }).then((res) => res.data)
}

// GET /orders/{reference} — public, no login required
export function getOrderByReference(reference: string): Promise<Order> {
  return apiFetch<{ data: Order }>(`/orders/${reference}`).then((res) => res.data)
}

// GET /my-orders — requires login
export function getOrders(): Promise<Order[]> {
  return apiFetch<{ data: Order[] }>('/my-orders').then((res) => res.data)
}

// GET /admin/orders — admin only, paginated on the backend but we just
// unwrap the .data array here since AdminOrders renders a flat list.
export function getAdminOrders(): Promise<Order[]> {
  return apiFetch<{ data: Order[] }>('/admin/orders').then((res) => res.data)
}


// PATCH /adimn / orders / { order } / status
// NOTE: no `actor` field sent — the backend derives it from the logged-in
// admin's own name automatically (UpdateOrderStatusRequest has no actor
// field at all). AdminOrders.tsx's "Updated by" input is currently
// cosmetic only until that page is updated to stop sending it.
export function updateOrderStatus(input: {
  id: number
  status: OrderStatus
  note?: string
}): Promise<Order> {
  return apiFetch<{ data: Order }>(`/admin/orders/${input.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: input.status, note: input.note }),
  }).then((res) => res.data)
}


/* ---------------------------------- Reviews --------------------------------- */


// GET /products/{product}/reviews — public, no login required.
// NOTE: the backend's route-model binding is by the product's numeric ID
// here, NOT its slug (unlike GET /products/{slug} for the product itself)
// — see ReviewController::index(Product $product). Pass product.id, not
// product.slug, when calling this.
export function getReviews(productId: number | string): Promise<Review[]> {
  return apiFetch<{ data: Review[] }>(`/products/${productId}/reviews`).then((res) => res.data)
}


// POST /products/{product}/reviews — REQUIRES LOGIN now (401 for guests).
// `author` is no longer sent — the backend takes it from the logged-in
// user's own account name, so it can't be spoofed. ProductReviews.tsx's
// name input needs to be removed once you update that component.
export function createReview(input: {
  product_id: number
  rating: number
  body: string
}): Promise<Review> {
  return apiFetch<{ data: Review }>(`/products/${input.product_id}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating: input.rating, body: input.body }),
  }).then((res) => res.data)
}

/* --------------------------------- Wishlist --------------------------------- */

export interface WishlistItemApi {
  id: number
  size: string | null
  product: Product
  added_at: string
}

// GET /wishlist — REQUIRES LOGIN (401 for guests)
export function getWishlist(): Promise<WishlistItemApi[]> {
  return apiFetch<{ data: WishlistItemApi[] }>('/wishlist').then((res) => res.data)
}

// POST /wishlist
export function addToWishlist(productId: number, size: string | null = null): Promise<WishlistItemApi> {
  return apiFetch<{ data: WishlistItemApi }>('/wishlist', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, size }),
  }).then((res) => res.data)
}

// DELETE /wishlist/{wishlistItem}
export function removeWishlistItem(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/wishlist/${id}`, { method: 'DELETE' })
}

// POST /wishlist/sync — call after login with whatever was tracked
// locally for a guest, since there's no server-side guest wishlist.
export function syncWishlist(
    lines: { product_id: number; size: string | null }[],
): Promise<WishlistItemApi[]> {
  return apiFetch<{ data: WishlistItemApi[] }>('/wishlist/sync', {
    method: 'POST',
    body: JSON.stringify({ items: lines }),
  }).then((res) => res.data)
}

/* --------------------------------- Messaging -------------------------------- */

// POST /messages — public contact form
export function createMessage(input: {
  name: string
  email: string
  subject: string
  body: string
}): Promise<Message> {
  return apiFetch<{ data: Message }>('/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.data)
}

// GET /admin/messages — admin only
export function getMessages(): Promise<Message[]> {
  return apiFetch<{ data: Message[] }>('/admin/messages').then((res) => res.data)
}

// POST /admin/messages/{message}/reply
// NOTE: only `body` is sent — `author`/`author_name` are no longer
// accepted, the backend derives them from the logged-in admin. See the
// AdminMessages.tsx note below.
export function replyToMessage(input: { id: number; body: string }): Promise<Message> {
  return apiFetch<{ data: Message }>(`/admin/messages/${input.id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body: input.body }),
  }).then((res) => res.data)
}

// PATCH /admin/messages/{message}/read
export function markMessageRead(id: number): Promise<Message> {
  return apiFetch<{ data: Message }>(`/admin/messages/${id}/read`, {
    method: 'PATCH',
  }).then((res) => res.data)
}

/* ---------------------------------- Admin ----------------------------------- */

// GET /admin/dashboard
// GET /admin/dashboard/stats — real backend endpoint (DashboardController::stats()).
export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<{ data: DashboardStats }>('/admin/dashboard/stats').then((res) => res.data)
}

// GET /admin/analytics/sales — real backend endpoint (DashboardController::analytics()).
// Supports filtering by region via query param; `from`/`to` date filters
// aren't implemented server-side yet, so they're accepted here for API
// shape compatibility but currently have no effect — flagging so this
// isn't mistaken for a working filter if you wire up date pickers later.
export function getSalesAnalytics(
  filters: { from?: string; to?: string; region?: string } = {},
): Promise<SalesAnalytics> {
  const query = new URLSearchParams()
  if (filters.region) query.set('region', filters.region)

  return apiFetch<{ data: SalesAnalytics }>(`/admin/analytics/sales?${query.toString()}`).then(
    (res) => res.data,
  )
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


/* ---------------------------------- Admin: customers ------------------------------ */

export function getCustomers(): Promise<RawPaginated<AdminCustomer>> {
  return apiFetch<{ data: RawPaginated<AdminCustomer> }>(
    '/admin/customers',
  ).then((res) => res.data)
}

export function getCustomer(
  id: number,
): Promise<AdminCustomer & { orders: Order[] }> {
  return apiFetch<{ data: AdminCustomer & { orders: Order[] } }>(
    `/admin/customers/${id}`,
  ).then((res) => res.data)
}

/* ------------------------------ Account access ------------------------------ */

export interface AuthMessage {
  message: string
}
