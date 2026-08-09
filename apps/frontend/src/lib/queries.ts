import { queryOptions } from '@tanstack/react-query'
import type { ProductQueryParams } from '@/types'
import * as api from './api'
import { getMaterials } from './api'

export const MAX_PRICE = 16000

export const materialsQuery = () =>
  queryOptions({
    queryKey: ['materials'],
    queryFn: getMaterials,
  })

export const productsQuery = (params: ProductQueryParams = {}) =>
  queryOptions({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
  })

export const productQuery = (id: number | string) =>
  queryOptions({
    queryKey: ['product', String(id)],
    queryFn: () => api.getProduct(id),
  })

export const categoriesQuery = () =>
  queryOptions({ queryKey: ['categories'], queryFn: api.getCategories })

export const reviewsQuery = (productId: number | string) =>
  queryOptions({
    queryKey: ['reviews', String(productId)],
    queryFn: () => api.getReviews(Number(productId)),
  })

export const ordersQuery = () =>
  queryOptions({ queryKey: ['orders'], queryFn: api.getOrders })

export const orderQuery = (reference: string) =>
  queryOptions({
    queryKey: ['order', reference],
    queryFn: () => api.getOrderByReference(reference),
  })


// GET /admin/orders — EVERY order in the store, admin-only. Distinct
// from ordersQuery above — an admin viewing the orders dashboard needs
// to see ALL orders, not just their own personal purchase history.
export const adminOrdersQuery = () =>
  queryOptions({ queryKey: ['admin-orders'], queryFn: api.getAdminOrders })

// Fixed: api.getUser doesn't exist — the real function is me(), added
// back in Phase 2's auth build-out. Rely on this to fetch the CURRENT
// logged-in user's fresh data from /auth/me, distinct from useAuth()'s
// `user` (which is just whatever was cached from the last login/register
// response — this query re-fetches from the server).
export const currentUserQuery = () =>
  queryOptions({ queryKey: ['me'], queryFn: api.me })

export const dashboardStatsQuery = () =>
  queryOptions({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
  })

export const salesAnalyticsQuery = (
  filters: { from?: string; to?: string; region?: string } = {},
) =>
  queryOptions({
    queryKey: ['sales-analytics', filters],
    queryFn: () => api.getSalesAnalytics(filters),
  })

// Admin-only — matches MessageController::index() (GET /admin/messages).
export const messagesQuery = () =>
  queryOptions({ queryKey: ['messages'], queryFn: api.getMessages })

// customerMessagesQuery removed — it called api.getCustomerMessages,
// which no longer exists. The real Messages API has no "look up by
// customer email" endpoint; only admin-scoped index/show/reply/markRead.
// If you need a "my messages" feature for logged-in customers later,
// that would need a NEW backend endpoint first (e.g. GET /my-messages),
// not something addable purely on the frontend.
