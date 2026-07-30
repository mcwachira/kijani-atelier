import {queryOptions} from '@tanstack/react-query'
import type {ProductQueryParams} from "@/types"
import * as api from "./api"


export const productsQuery = (params:ProductQueryParams ={}) => queryOptions({queryKey:["products",params], queryFn:()=>api.getProducts(params)})

export const productQuery = (id:number |string) => queryOptions({queryKey:["product", String(id)], queryFn:() => api.getProduct(id)})

export const categoriesQuery = () => queryOptions({queryKey:['categories'], queryFn:api.getCategories})

export const reviewsQuery = (productId:number | string) => queryOptions({queryKey:["reviews", String(productId)], queryFn:() => api.getReviews(productId)})

export const ordersQuery = () => queryOptions({ queryKey: ["orders"], queryFn: api.getOrders });

export const userQuery = () => queryOptions({ queryKey: ["user"], queryFn: api.getUser });

export const dashboardStatsQuery = () =>
  queryOptions({ queryKey: ["dashboard-stats"], queryFn: api.getDashboardStats });

export const salesAnalyticsQuery = (filters: { from?: string; to?: string; region?: string } = {}) =>
  queryOptions({ queryKey: ["sales-analytics", filters], queryFn: () => api.getSalesAnalytics(filters) });

export const messagesQuery = () => queryOptions({ queryKey: ["messages"], queryFn: api.getMessages });