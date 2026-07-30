export type Material = "leather" | "woven" | "beads" | "brass";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  products_count: number;
}

export interface Review {
  id: number;
  product_id: number;
  author: string;
  rating: number;
  body: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  category: Category;
  description: string;
  craft_note: string;
  materials: Material[];
  sizes: string[];
  images: string[];
  stock: number;
  rating: number;
  reviews_count: number;
  is_new: boolean;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  size?: number;
  material?: Material;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  per_page?: number;
  featured?: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size: number | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin";
}

export interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  size: number | null;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: number;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  county: string;
  town: string;
  address: string;
  payment_method: "mpesa" | "card";
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  created_at: string;
}

export interface CheckoutPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  town: string;
  payment_method: "mpesa" | "card";
  items: { product_id: number; quantity: number; size: number | null }[];
}

export interface DashboardStats {
  total_sales: number;
  orders_count: number;
  customers_count: number;
  average_order_value: number;
  revenue_series: { month: string; revenue: number; orders: number }[];
  recent_orders: Order[];
}

export interface SalesAnalytics {
  by_region: { region: string; sales: number; orders: number }[];
  by_month: { month: string; revenue: number }[];
  top_products: { name: string; units: number; revenue: number }[];
}

export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  unread: boolean;
  created_at: string;
}
