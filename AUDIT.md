# Kijani Atelier — Full Project Audit

**Date:** 2026-08-12
**Scope:** `apps/backend` (Laravel/Pest) + `apps/frontend` (TanStack Start)
**Method:** Direct code reading and tracing (migration → model → controller → route → test → frontend page/hook), plus an actual test run (`make test` scoped to `tests/Feature/Payments`). No browser/screenshot access was available in this session (Chrome extension not connected) — anything requiring visual verification is explicitly flagged as unverified rather than guessed.

Legend: ✅ complete and verified · ⚠️ partial / has a real gap · ❌ missing or broken

---

## 1. Feature completeness

### Backend (routes confirmed registered in `routes/api.php`, all under `/api/v1`)

| Feature | Status | Evidence |
|---|---|---|
| Auth: register/login/logout/verify/reset | ✅ | `AuthController`, `PasswordResetController`, `VerificationController`; routes `routes/api.php:29-53`; tests in `tests/Feature/Auth/*` (4 files) all assert meaningful outcomes (DB rows, enumeration-safe reset messaging, signed-URL 403 on bad hash). |
| Catalog: categories/materials/sizes/products, public + admin CRUD | ✅ | Controllers + migrations + models present; public routes `:63-70`, admin CRUD gated `auth:sanctum`+`admin` at `:77-90`; 4 test files, 32 cases total. |
| Cart: guest (X-Cart-Token) + logged-in + merge-on-login | ✅ | `CartController.php` `resolveCart()`:31, `merge()`:171-213 (real logic — combines quantities, deletes guest cart/token). `auth.optional` middleware (`app/Http/Middleware/OptionalSanctumAuth.php`) resolves guest vs. user. `CartTest.php` explicitly tests merge and quantity-combining. |
| Wishlist: add/remove/sync (backend) | ✅ | `WishlistController.php` index/store/destroy/sync all present, `auth:sanctum`-gated; `WishlistTest.php` covers 401-guest, idempotency, ownership, sync. |
| Reviews: list + submit, login-gated | ⚠️ | Backend logic correct — submit is gated by route middleware (`routes/api.php:116`, `auth:sanctum`), author name taken server-side (`ReviewController.php:47`, can't be spoofed), tested with an explicit 401 case. **But the auth check lives only in route middleware, not defensively in the controller** — `ReviewController::store` calls `$request->user()->id` with no null guard, so if that middleware were ever dropped it would 500 instead of 401. Minor robustness gap, not currently exploitable. |
| Orders: guest checkout, lookup, customer history, admin management + status | ⚠️ | Checkout uses a DB transaction with `lockForUpdate()` stock check and server-re-read pricing (`OrderController.php:35-90`), so price/stock can't be spoofed by the client. **But `UpdateOrderStatusRequest.php:22` validates status only against a flat `in:pending,paid,shipped,delivered,cancelled` list — there is no state machine or transition guard.** An admin (or a bug, or a compromised admin session) can PATCH any order directly from `pending` to `delivered`, or from `cancelled` back to `paid`. No test exercises an invalid transition, because there's no code to test. |
| Messages: public contact form + admin inbox/reply | ✅ | `MessageController.php` full CRUD-ish flow; routes `:130-136`; `MessageTest.php` covers public submit, validation, 403-gate, reply, markRead. |
| Admin: dashboard stats, sales analytics, customer list (backend) | ✅ | `DashboardController.php` `stats()`:24, `analytics()`:61 (region breakdown, top products); `CustomerController.php` index/show; routes `:150-154`; `DashboardTest.php`/`CustomerTest.php` assert real aggregation behavior (cancelled orders excluded, region filter, spend totals). |
| Payments: M-Pesa | ✅ | See §2. |
| Payments: Paystack | ❌ | **No backend implementation exists at all.** No `PaystackService`, no controller methods, no routes, no `config/paystack.php`, no `paystack` entry in `config/services.php`. `grep -ril paystack apps/backend --include=*.php` (excluding vendor) returns zero matches. `.env` does contain `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY`/`PAYSTACK_CALLBACK_URL`, but nothing consumes them. |

**Route bug (minor):** `routes/api.php:141` and `:146` register `/mpesa/initiate` twice at two different URLs — `/v1/payments/mpesa/initiate` (no throttle, this is the one tests and the frontend actually call) and `/v1/mpesa/initiate` (`throttle:5,1`, dead — nothing calls this URL). The rate limit that was presumably intended for the real endpoint is not applied to it.

### Frontend wiring (`apps/frontend/src/lib/api.ts` and routes)

| Feature | Status | Evidence |
|---|---|---|
| Auth pages | ✅ | `routes/register.tsx`, `login.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx` all call real endpoints. Logout revokes server-side token then clears local state (`Navbar.tsx:126-132`). |
| Shop/catalog browsing | ✅ | `routes/shop.tsx`, `routes/products.$productId.tsx` — real, paginated, filterable queries. |
| Cart + merge-on-login | ✅ | `hooks/use-cart.tsx` fully backend-backed; merge triggered post-login/register (`routes/login.tsx:52`, `routes/register.tsx:65`) after the bearer token is set. |
| Wishlist (frontend) | ⚠️ | **Local-storage only.** `hooks/use-whishlist.tsx` never calls the real `getWishlist`/`addToWishlist`/`removeWishlistItem` functions defined in `lib/api.ts:517-532` — those are dead code, never invoked anywhere. Only a one-way, fire-and-forget `syncWishlist()` push happens after login. `routes/wishlist.tsx` has no login gating and renders from local state only, so a user's wishlist doesn't actually follow them across devices despite a real synced backend existing for it. |
| Reviews: list | ❌ | **Broken.** `lib/queries.ts:32` calls `api.getReviews(...)`, but `getReviews` is not exported from `lib/api.ts` at all (only `createReview` exists). Every product page's review list silently fails and shows "Failed to load reviews / Retry" — retrying does nothing, forever, since the function doesn't exist. |
| Reviews: submit | ✅ | `features/products/ProductReviews.tsx:38,119-170` — real POST, correctly login-gated in the UI (shows "Sign in to leave a review" fallback if no token). |
| Checkout (guest) | ✅ | See §2 — payment-gated, doesn't navigate to success prematurely. |
| Order lookup page | ✅ | `routes/orders.$reference.tsx` — real. |
| Customer order history page | ❌ | **Does not exist.** `getOrders()`/`ordersQuery()` (a real, working `/my-orders` backend route) is defined in `lib/api.ts`/`lib/queries.ts` but never imported by any route — confirmed via repo-wide grep. A logged-in customer has no page to view past orders. |
| Contact/message form | ✅ | `routes/messages.tsx` — real. |
| Admin: dashboard | ⚠️ | `routes/admin.index.tsx:51` is wired to `getDashboardStats()` (`lib/api.ts:586-601`), which is a **hybrid mock**: `orders_count`/`recent_orders` are real, but `total_sales: 2_486_500`, `customers_count: 486`, `average_order_value: 8_950`, and the entire `revenue_series` are hardcoded placeholders — despite a real, working `/admin/dashboard/stats` backend endpoint existing and never being called for those fields. |
| Admin: sales analytics | ❌ | `routes/admin.analytics.tsx:94` → `getSalesAnalytics()` (`lib/api.ts:603-631`) is **100% fabricated** via a `mock()` helper — hardcoded Kenyan regions, made-up revenue/order counts, `top_products: []`. The real backend `/admin/analytics/sales` endpoint (confirmed working, tested) is never called. This page currently lies to whoever views it. |
| Admin: customer list | ❌ | **No frontend page exists at all**, despite a real, tested backend endpoint (`/admin/customers`). No `getCustomers` function in `api.ts`, no `routes/admin.customers.tsx`. |
| Admin: orders management | ✅ | `routes/admin.orders.tsx` — real. |
| Admin: product/category CRUD | ✅ | `routes/admin.products.tsx`, `routes/admin.categories.tsx` — real. |
| Admin: message inbox | ✅ | `routes/admin.messages.tsx` — real. |
| Payments: card/Paystack (frontend) | ❌ | Fully built in the UI (`CardPayment` component in `checkout.index.tsx`, plus a duplicate orphaned implementation in `features/checkout/PaymentPanel.tsx`) and calls `initiatePaystackPayment()`/`verifyPaystackPayment()` (`lib/api.ts:412-439`) against `/payments/card/initiate` and `/payments/card/verify/{reference}` — **neither route exists on the backend**, so card checkout 404s in production today. |

**Other dead code found:** `features/checkout/PaymentPanel.tsx` + `hooks/use-payment-status.tsx` are a second, unused implementation of the M-Pesa/card payment step — not imported by any route, orphaned.

---

## 2. Payment flow verification

### M-Pesa — ✅ solid, fully tested

- **Amount integrity**: `PaymentController.php:27-28` reads `$amount = $order->total` from the DB order (looked up via `order_reference`, the only client-supplied field); the client can't inject an amount. Confirmed by test assertion `MpesaPaymentTest.php:46-51`.
- **STK push**: `app/Services/Mpesa/MpesaService.php:54-80` calls the real Safaricom Daraja URL from `config('mpesa.base_url')` (sandbox/production per env), phone numbers normalized before being sent. Tests fake this via `Http::fake(...)` — the real API is never hit in CI.
- **Callback handling**: `PaymentController.php:50-59` reads the raw payload and matches on `CheckoutRequestID`. **No signature/secret/IP-allowlist check exists** — this matches Safaricom's actual Daraja contract (no HMAC scheme), but it does mean the callback endpoint is open to anyone who can guess a valid `checkout_request_id` and POST a forged "success" payload. Not currently mitigated by an IP allowlist for Safaricom's published ranges. Worth a defensive follow-up, not a blocker.
- **forceFill, not update()**: confirmed at `PaymentController.php:86-92` (`$payment->forceFill(['status'=>'completed','provider_reference'=>...,'raw_payload'=>...])->save()` and `$payment->order->forceFill(['status'=>'paid'])->save()`), correctly bypassing `$fillable` on both `Payment` (`app/Models/Payment.php:13`, excludes `status`/`provider_reference`) and `Order` (`app/Models/Order.php:14-15`, excludes `status`). Failure branch also uses `forceFill` (line 103).
- **Idempotency**: `PaymentController.php:71-73` — `if ($payment->status !== 'pending') { return ...'Already processed'... }` short-circuits a repeat callback before the transaction runs again. Verified by `MpesaPaymentTest.php:146-179`, which sends the identical callback twice and asserts only one `OrderStatusEvent` row was created — **this test passed** in the run below.

### Paystack — ❌ does not exist on the backend

None of the requested checks (webhook `hash_equals` vs `===`, forceFill on webhook, `verify()` fallback) apply because **there is no Paystack code to check** — no service class, no controller methods, no routes, no config. This is the single biggest gap in the entire payments area: credentials are provisioned in `.env`, the frontend fully implements the initiate + redirect + verify-on-return flow, but the backend that's supposed to receive those calls was never built. Card checkout is non-functional end to end today.

### Frontend checkout flow — ✅ correctly payment-gated (for the M-Pesa path)

- `routes/checkout.index.tsx`: `createOrder` on submit does **not** navigate to success. A code comment at lines 69-72 explicitly states the order isn't "done" until payment completes. Navigation to `/checkout/success` only happens once `getPaymentStatus` polling returns `'completed'` (line 336-341).
- **M-Pesa polling timeout**: two implementations, both capped — `routes/checkout.index.tsx:324,348-352` and the orphaned `hooks/use-payment-status.tsx:15,33-38` — both poll every 3s with a hard cap of 40 attempts (~2 minutes), then set a `timedout` state. Not infinite.
- **Paystack redirect-back param handling**: correctly implemented in `routes/checkout.success.tsx:15-23,44-57` — disambiguates via `trxref` (Paystack-only param): if present, the internal order reference is recovered from `sessionStorage` (`kijani_pending_order_reference`, stashed before redirect at `checkout.index.tsx:470`) rather than confused with Paystack's own `?reference=`. Well-designed, but moot in practice since the backend it calls doesn't exist.

### Test run — actual results

```
$ make test          # runs: docker compose exec app php artisan test --env=testing
```
Scoped to `tests/Feature/Payments/` (the only payments test file — `MpesaPaymentTest.php`; there is no Paystack test file, consistent with no Paystack backend to test):

```
PASS  Tests\Feature\Payments\MpesaPaymentTest
✓ it initiates an STK push for a valid order                              1.04s
✓ it rejects an STK push for a nonexistent order reference                0.03s
✓ it rejects a malformed phone number                                    0.02s
✓ it marks a payment completed and the order paid on a successful callback 0.06s
✓ it marks a payment failed on a failed callback, without touching the order status 0.04s
✓ it is idempotent — processing the same callback twice only applies it once 0.06s
✓ it gracefully ignores a callback for an unknown checkout_request_id     0.04s
✓ it reports payment and order status via the polling endpoint           0.04s

Tests: 8 passed (21 assertions)
Duration: 1.48s
```

**8/8 passed.** M-Pesa payments are genuinely working and tested. Paystack cannot be reported as working — it doesn't exist.

---

## 3. SEO check

| Route | head()/meta | Dynamic per-item? | og tags | Notes |
|---|---|---|---|---|
| `/` (home) | ✅ `src/routes/index.tsx:17-38` | N/A (static is fine for a homepage) | ✅ | Fine as-is. |
| `/shop` | ⚠️ `shop.tsx:67-81` | ❌ static, doesn't vary with `?category=` | ✅ (generic) | `/shop?category=sandals` and `/shop?category=bags` ship the identical "Shop All" title/description — no per-category meta despite category being a real, filterable param. |
| `/products/$productId` | ❌ `products.$productId.tsx:21-39` | ❌ **fully static** — `head()` never touches the loaded product | ✅ (generic) | **Every product page on the site ships the identical `<title>Product — Kijani Atelier</title>` and identical description/og tags.** Product data is fetched later inside the component (`useQuery` at line 43) but never fed back into `head()`. This is the exact "generic fallback reused everywhere" problem the audit was checking for. |
| `/orders/$reference` | ⚠️ | ❌ static, doesn't interpolate the reference | — | Correctly includes `{ name: 'robots', content: 'noindex' }` (line 36) — right call for a private order page. |
| `/cart`, `/checkout`, `/checkout/success`, `/wishlist`, `/messages` | ✅ static | N/A (transactional pages, static is acceptable) | mostly ✅; `/messages` has no og tags | Minor, low priority. |
| `/about` | ❌ **no `head()` at all** | — | — | Falls back to root default. Also, the page content itself is unedited TanStack Start starter boilerplate ("A small starter with room to grow... TanStack Start gives you type-safe routing..."), not actual About content for Kijani Atelier. |
| Root fallback (`__root.tsx:84-115`) | ✅ | — | ✅ + Twitter card | Solid default: charset, viewport, og:type, twitter:card=summary_large_image. |

**Sitemap**: ❌ missing entirely. `apps/frontend/public/` doesn't exist as a directory at all — no static `sitemap.xml`, no dynamically generated sitemap route.

**robots.txt**: ❌ missing on the frontend (same reason — no `public/` dir). A `robots.txt` exists only under `apps/backend/public/robots.txt`, which is Laravel's default and irrelevant to storefront crawlability.

**Product image alt text**: ✅ mostly good — `features/products/ProductCard.tsx:19` and the product-page hero image (`products.$productId.tsx:98`) both use `alt={product.name}`, real and descriptive. Minor: the product-page thumbnail strip (`products.$productId.tsx:117`) and checkout summary thumbnails (`checkout.index.tsx:250`) use `alt=""` — low priority since decorative/non-indexed contexts.

**SSR vs client-only rendering — the most consequential SEO finding**: SSR is enabled at the framework level (`vite.config.ts:12`, `tanstackStart()`), but **no route in the entire app uses a TanStack Router `loader`** (`grep -rn "loader" src/routes/` → zero matches). Every data-bearing page (`/`, `/shop`, `/products/$productId`, `/orders/$reference`, `/checkout/success`) fetches its data via `useQuery` inside the component, after hydration, with `Skeleton` placeholders as the initial render. Combined with the static `head()` on product pages, this means: a crawler that doesn't execute JS (or gives up before hydration completes) sees a page with a generic, identical title and an empty skeleton where the product content should be — on every single product page. This is a real, current SEO problem for the site's highest-value pages (products, categories), not a hypothetical one.

---

## 4. Responsiveness check

**Visual screenshots were not performed** — the Chrome browser extension was not connected in this session, so 375px/768px/1280px screenshots of home/shop/product/checkout could not be captured. Everything below is static code analysis only; a visual pass is still recommended before shipping.

- **Hardcoded pixel widths**: ✅ none found at the layout level. All arbitrary-bracket (`w-[...]`) hits are small UI primitives (drawer handle, switch track, dropdown min-width) or explicitly viewport-clamped (`features/support/ChatWidget.tsx:63`, `w-[min(22rem,calc(100vw-2rem))]`). No unconditional fixed-width containers found anywhere (`w-screen` has zero occurrences; no raw `style="width: NNNpx"` on a layout container).
- **Navbar**: ✅ clean `lg:` split — desktop nav `hidden ... lg:flex` (`Navbar.tsx:210`), mobile trigger `lg:hidden` (`:142`).
- **ProductGrid**: ✅ `grid-cols-2 ... lg:grid-cols-3` (`ProductGrid.tsx:35`).
- **Checkout two-column layout**: ✅ `grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]` (`checkout.index.tsx:137`) — implicitly single-column below `lg:`.
- **Admin tables**: ⚠️ no responsive reflow — rely on the shared `Table` primitive's default `overflow-x-auto` wrapper (`components/ui/table.tsx:6-10`), so a 9-column orders table horizontally scrolls on mobile rather than collapsing into a card/stacked view. Functional but not a great mobile admin experience.
- **Mobile Sheet vs. desktop nav — category links**: ✅ verified identical — both driven from the same `NAV_LINKS` constant (`Navbar.tsx:27-33`), mapped in both the desktop `<nav>` (line 210) and mobile Sheet `<nav>` (line 150).
- **Mobile Sheet vs. desktop nav — auth links**: ❌ **drift found, as anticipated.** Mobile Sheet (logged out, lines 184-200) shows both "Sign in" (`/login`) and "Create account" (`/register`) as text links. Desktop header (logged out, lines 277-283) shows only a single icon button linking to `/login` — **there is no direct `/register` link anywhere in the desktop header.** A desktop visitor has no visible path to registration from the navbar; they'd have to open `/login` and find the in-page link there.
- **Fixed-width containers with no responsive override**: ✅ none found — all page containers use Tailwind `max-w-*` scale classes with fluid width and responsive padding (`px-4 sm:px-6 lg:px-8`).

---

## 5. Priority fixes

Ranked by (a) broken > incomplete > polish, (b) customer-facing > admin-facing:

1. **Reviews list is broken on every product page** — `lib/queries.ts:32` calls `api.getReviews`, which doesn't exist in `lib/api.ts`. Add the function (backend route already exists and works: `GET /products/{product}/reviews`). Customer-facing, currently broken, cheap fix.
2. **Card/Paystack payment is fully built on the frontend but has zero backend implementation** — `/payments/card/initiate` and `/payments/card/verify/{reference}` 404. Either build the Paystack backend (service, controller methods, webhook with `hash_equals` signature verification, `verify()` fallback, routes, config, tests) or remove the card option from checkout until it's ready — leaving it live and silently broken is worse than not offering it.
3. **Admin sales analytics page shows 100% fabricated data** (`lib/api.ts:603-631`) while looking like a live dashboard — wire it to the real, tested `/admin/analytics/sales` endpoint. Risk: business decisions made off fake numbers.
4. **Admin dashboard shows partially fabricated data** (`total_sales`, `customers_count`, `average_order_value`, `revenue_series` in `lib/api.ts:586-601`) — same fix, wire to the real `/admin/dashboard/stats` endpoint.
5. **No customer order-history page** despite a real, working `/my-orders` backend endpoint (`getOrders`/`ordersQuery` defined but never used) — customers can only look up one order at a time by reference. Customer-facing gap.
6. **No admin customer list page** despite a real, tested backend endpoint — build `routes/admin.customers.tsx`.
7. **Product/category/order pages are client-fetch-only with no route `loader`**, so despite SSR being enabled, crawlers likely see empty skeletons and a generic, non-product-specific `<head>` on every product page (`products.$productId.tsx:21-39`). This is the single largest SEO gap — fix by adding loaders (or at minimum making `head()` product-aware) for `/shop`, `/products/$productId`, and `/orders/$reference`.
8. **No sitemap.xml or robots.txt on the frontend** (`apps/frontend/public/` doesn't exist) — add both; straightforward and high-value for a storefront.
9. **Order status has no transition guard** (`UpdateOrderStatusRequest.php:22`) — any status can be set from any status. Add an explicit allowed-transitions map before this becomes a real operational bug (e.g. accidentally re-opening a cancelled/delivered order).
10. **Wishlist is local-storage-only** despite a fully working, tested backend (`getWishlist`/`addToWishlist`/`removeWishlistItem` defined but never called) — a user's wishlist doesn't follow them across devices. Lower priority than the above but a real feature gap relative to what's already built server-side.

**Not urgent but worth knowing about:** the duplicate `/mpesa/initiate` route registration means the intended `throttle:5,1` rate limit doesn't apply to the endpoint that's actually used (`routes/api.php:141` vs `:146`); the M-Pesa callback endpoint has no signature/IP verification (inherent to Daraja's design, but worth an IP-allowlist as defense in depth); `/about` has unedited starter-template copy; admin tables don't reflow on mobile (horizontal scroll only); desktop navbar has no visible `/register` link.
