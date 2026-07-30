# Kijani Atelier

Handcrafted e-commerce platform for a Kenyan artisan brand — leather sandals, kiondos, woven handbags, and beaded accessories.

## Architecture

```text
kijani-atelier/
├── apps/
│   ├── frontend/     # TanStack Start + React 19 (Vite, SSR)
│   └── backend/      # Laravel (PHP) API
└── packages/         # Shared packages (empty, ready for extraction)
```

## Frontend

Built with [TanStack Start](https://tanstack.com/start/latest) (SSR), [TanStack Router](https://tanstack.com/router/latest), [TanStack Query](https://tanstack.com/query/latest), React 19, and Tailwind CSS v4.

### Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (SSR with Nitro) |
| UI | React 19, shadcn/ui, Lucide icons |
| Routing | TanStack Router (file-based, type-safe) |
| Data fetching | TanStack Query (SWR caching, optimistic updates) |
| Styling | Tailwind CSS v4 (`tw-animate-css`, custom oklch design tokens) |
| Persistence | `localStorage` via `usePersistedState` (cart, wishlist, theme) |
| Language | TypeScript 6 (strict, `noUnusedLocals`) |
| Dev tools | TanStack Devtools (router + query), Vite 8 |

### Routes

| Path | Page |
|---|---|
| `/` | Home — hero, featured products, newsletter CTA, testimonials |
| `/shop` | Product catalog with search, filters (category/size/price/material), sort, pagination |
| `/products/$productId` | Product detail — gallery, size selector, add-to-cart, reviews, related products |
| `/cart` | Shopping bag — quantity controls (Minus at 1 removes item), line-item remove, checkout link |
| `/checkout` | Checkout form — delivery details, M-Pesa/Card payment selection, order summary |
| `/orders/$reference` | Order confirmation — items, status, delivery details |
| `/wishlist` | Saved items — size selection, move-to-bag, move-all-to-bag |
| `/login` | Sign in — authenticates user, persists session |
| `/register` | Create account — registers and persists session |
| `/about` | Brand story |
| `/demo/tanstack-query` | TanStack Query demo page |

### Key Features

- **Client-side search** — Debounced (250ms) product search with recent searches history, highlighted matches, keyboard navigation, responsive Sheet overlay on mobile
- **Cart** — Persistent (v1→v2 migration), flat KSh 350 shipping, quantity management, fire-and-forget removal
- **Wishlist** — Persistent, per-product size selection, bulk move to cart
- **Theme** — Light/dark toggle with `localStorage` persistence, system preference detection, flash-free SSR via inline script
- **Chat** — Live support widget with bot auto-replies
- **Admin (mock)** — Dashboard with revenue chart, sales analytics by region, order management, message inbox
- **Mock API layer** — `request<T>()` helper ready for Laravel; swap by setting `VITE_API_BASE_URL`

### State Management

- **CartContext** / **WishlistContext** / **ThemeContext** — React Context + `usePersistedState` (typed hydration-safe localStorage hook)
- Router context provides `QueryClient` for SSR-safe data loading
- Optimistic updates on review submission (invalidate + setQueryData)

### Design System

Custom oklch colour tokens (sand, clay, gold, charcoal), Cormorant Garamond (display) + Karla (body), `eyebrow` and `hover-lift` utilities. No hardcoded colours in components.

### Getting Started

```bash
# Frontend
cd apps/frontend
npm install
npm run dev          # → http://localhost:3000
npm run generate-routes  # Regenerate routeTree.gen.ts after adding routes
npm run build        # Production build
npm run check        # Prettier + ESLint
```

## Backend

Standard [Laravel](https://laravel.com) API with Sanctum authentication.

```bash
cd apps/backend
cp .env.example .env
composer install
php artisan key:generate
php artisan serve    # → http://127.0.0.1:8000
```

CORS is pre-configured for `http://localhost:3000` and `http://127.0.0.1:3000`.

## Development

```bash
# From root — run both
npm run dev:frontend
npm run dev:backend
```

The frontend currently uses **mock data** (`src/lib/mock-data.ts`). To connect the Laravel backend, set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in `apps/frontend/.env`.
