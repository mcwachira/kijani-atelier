
import type {
  CheckoutPayload,
  DashboardStats,
  Category,
  Message,
  Order,
  OrderItem,
  Paginated,
  Product,
  ProductQueryParams,
  Review,
  SalesAnalytics,
  User,
} from "@/types";

/**
 * --------------------------------------------------------------------------
 * MOCK DATA
 * --------------------------------------------------------------------------
 * Local static data used to simulate backend responses.
 * This allows frontend development without a real API.
 */
import { categories, messages, orders, products, reviews } from "./mock-data";

/**
 * --------------------------------------------------------------------------
 * BASE API URL
 * --------------------------------------------------------------------------
 * This will be used when switching from mock → real Laravel backend.
 * ⚠️ Should be: http://127.0.0.1:8000/api
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

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
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include", // Needed for Laravel Sanctum (cookie-based auth)
    ...init,
  });

  // Handle HTTP errors
  if (!res.ok) {
    throw new Error(
      (await res.text()) || `Request failed: ${res.status}`
    );
  }

  return (await res.json()) as T;
}

/**
 * --------------------------------------------------------------------------
 * MOCK HELPER
 * --------------------------------------------------------------------------
 * Simulates API delay to test loading states in UI.
 */
const mock = <T>(value: T, delay = 350): Promise<T> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(value), delay)
  );

/* -------------------------------------------------------------------------- */
/*                                PRODUCTS API                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /products
 * Fetch products with filters, sorting, and pagination.
 */
export function getProducts(
  params: ProductQueryParams = {}
): Promise<Paginated<Product>> {

  const perPage = params.per_page ?? 9;
  let list = [...products]; // clone products array

  /**
   * SEARCH FILTER
   * Matches product name or category name
   */
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q)
    );
  }

  /**
   * CATEGORY FILTER
   */
  if (params.category) {
    list = list.filter((p) => p.category.slug === params.category);
  }

  /**
   * PRICE FILTERS
   */
  if (params.min_price != null) {
    list = list.filter((p) => p.price >= params.min_price!);
  }

  if (params.max_price != null) {
    list = list.filter((p) => p.price <= params.max_price!);
  }

  /**
   * SIZE FILTER
   */
  if (params.size) {
    list = list.filter((p) => p.sizes.includes(params.size!));
  }

  /**
   * MATERIAL FILTER
   */
  if (params.material) {
    list = list.filter((p) => p.materials.includes(params.material!));
  }

  /**
   * FEATURED PRODUCTS
   */
  if (params.featured) {
    list = list.filter((p) => p.is_new);
  }

  /**
   * SORTING
   */
  if (params.sort === "price_asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (params.sort === "price_desc") {
    list.sort((a, b) => b.price - a.price);
  } else if (params.sort === "newest") {
    list.sort(
      (a, b) =>
        +new Date(b.created_at) - +new Date(a.created_at)
    );
  }

  /**
   * PAGINATION
   */
  const page = params.page ?? 1;
  const total = list.length;

  return mock({
    data: list.slice((page - 1) * perPage, page * perPage),
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
    },
  });
}

/**
 * GET /products/{id}
 * Fetch a single product by ID
 */
export function getProduct(id: number | string): Promise<Product> {
  const found = products.find(
    (product) => product.id === Number(id)
  );

  if (!found) {
    return Promise.reject(new Error("Product not found"));
  }

  return mock(found);
}

/**
 * GET /categories
 */
export function getCategories(): Promise<Category[]> {
  return mock(categories);
}

/**
 * GET /products/{id}/reviews
 */
export function getReviews(productId: number | string): Promise<Review[]> {
  return mock(
    reviews.filter(
      (review) => review.product_id == Number(productId)
    )
  );
}

/**
 * POST /products/{id}/reviews
 * Create a new review
 */
export function createReview(input: {
  product_id: number;
  rating: number;
  body: string;
  author: string;
}) {
  return mock<Review>({
    id: Date.now(),
    product_id: input.product_id,
    author: input.author,
    rating: input.rating,
    body: input.body,
    created_at: new Date().toISOString().slice(0, 10),
  });
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
    const product = products.find((p) => p.id === item.product_id);
    return {
      product_name: product?.name ?? `Product #${item.product_id}`,
      quantity: item.quantity,
      price: product?.price ?? 0,
      size: item.size,
    };
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
      status: "pending",
      total,
      items,
      created_at: new Date().toISOString(),
    },
    900
  );
}

/**
 * GET /orders
 */
export function getOrders(): Promise<Order[]> {
  return mock(orders);
}

/* -------------------------------------------------------------------------- */
/*                                   AUTH                                     */
/* -------------------------------------------------------------------------- */

/**
 * POST /login
 * Returns mock user + token
 */
export function login(credentials: {
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {

  return mock(
    {
      user: {
        id: 1,
        name: "Wanjiru Kamau",
        email: credentials.email,
        role: "customer" as const,
      },
      token: "mock-token",
    },
    700
  );
}

/**
 * POST /register
 */
export function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {

  return mock(
    {
      user: {
        id: 2,
        name: input.name,
        email: input.email,
        role: "customer" as const,
      },
      token: "mock-token",
    },
    700
  );
}

/**
 * GET /user
 * Returns current authenticated user
 */
export function getUser(): Promise<User | null> {
  return mock<User | null>(null, 150);
}

/* -------------------------------------------------------------------------- */
/*                                   ADMIN                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/dashboard
 * Dashboard summary stats
 */
export function getDashboardStats(): Promise<DashboardStats> {

  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

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
  });
}

/**
 * GET /admin/analytics/sales
 * Sales analytics data
 */
export function getSalesAnalytics(
  filters: { from?: string; to?: string; region?: string } = {}
): Promise<SalesAnalytics> {

  const regions = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Kiambu",
    "Machakos",
    "Eldoret",
  ];

  const by_region = regions.map((region, i) => ({
    region,
    sales: 420_000 - i * 48_000,
    orders: 128 - i * 14,
  }));

  return mock({
    by_region: filters.region
      ? by_region.filter((r) => r.region === filters.region)
      : by_region,

    /**
     * Monthly revenue
     */
    by_month: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
      (month, i) => ({
        month,
        revenue: 190_000 + i * 55_000,
      })
    ),

    /**
     * Top selling products
     */
    top_products: products.slice(0, 6).map((p, i) => ({
      name: p.name,
      units: 92 - i * 11,
      revenue: p.price * (92 - i * 11),
    })),
  });
}

/**
 * GET /admin/messages
 */
export function getMessages(): Promise<Message[]> {
  return mock(messages);
}

