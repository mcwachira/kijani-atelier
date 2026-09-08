# Kijani Atelier — Follow-Up Audit (Post-Fix Session)

**Date:** 2026-08-15
**Scope:** `apps/backend` (Laravel/Pest) + `apps/frontend` (TanStack Start)
**Method:** Direct code reading and tracing for every claimed fix, an actual `make test` run, an actual `npx tsc --noEmit` run, git-history forensics on the one regression found below, and a fresh independent pass over everything not covered by session 1's fixes. One subagent was used for the independent pass (§3); every finding it returned was re-verified directly against the source before being included here.

Legend: ✅ complete and verified · ⚠️ partial / real gap · ❌ missing or broken

---

## 1. Verification of fixes claimed this session

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | Paystack backend exists and is tested | ⚠️ | `PaystackService.php`, `PaymentController::initiatePaystack/paystackWebhook/verifyPaystack`, and routes `/payments/card/{initiate,webhook,verify/{reference}}` (`routes/api.php:141-149`) all exist. `PaystackPaymentTest.php` has 7 passing tests covering initialize, webhook signature accept/reject, failure event, and verify. **But `PaystackService.php:35` posts to `{$this->baseUrl}/transaction/initiate` — Paystack's real API endpoint is `/transaction/initialize`, not `/transaction/initiate`.** The test suite passes only because it fakes the same wrong URL (`PaystackPaymentTest.php:11`: `'*/transaction/initiate' => Http::response(...)`), so the mismatch is invisible to CI. Every real card-payment initiation would 404 against the live Paystack API. This is a live, currently-shipping bug hiding behind a green test suite. |
| 2 | Order status transition guard enforced | ✅ | `Order::validTransitions()` + `canTransitionTo()` (`app/Models/Order.php:44-66`); `OrderController::updateStatus` (`:173-181`) checks it and returns 422 with the from/to status in the message. `OrderTest.php` has 3 dedicated tests: valid transitions succeed, `cancelled → paid` is rejected 422 with status unchanged, and `pending → delivered` (skipping steps) is also rejected. All pass. |
| 3 | M-Pesa callback IP verification, default off | ✅ | `VerifyMpesaIp` middleware (`app/Http/Middleware/VerifyMpesaIp.php`) checks `config('mpesa.verify_callback_ip')` and returns 403 for non-allowlisted IPs when enabled. `config/mpesa.php:21`: `'verify_callback_ip' => env('MPESA_VERIFY_CALLBACK_IP', false)` — correctly defaults to `false`. Applied to the route: `routes/api.php:143-144`, `->middleware('verify.mpesa.ip')`. Two new tests cover both the allow and reject paths, both pass. |
| 4 | `getReviews` exported and used by product page | ✅ | `lib/api.ts:502-504` exports `getReviews`; `lib/queries.ts:29-33`'s `reviewsQuery` calls it; `ProductReviews.tsx:8,31` imports `reviewsQuery` and calls `useQuery(reviewsQuery(productId))`. Full chain traced, not just present-in-file. |
| 5 | Admin dashboard + sales analytics wired to real backend, no fabricated data | ⚠️ | `getDashboardStats()` (`lib/api.ts:602-604`) and `getSalesAnalytics()` (`:611-620`) both call real endpoints (`/admin/dashboard/stats`, `/admin/analytics/sales`) with no `mock()`/hardcoded values anywhere in either function — confirmed clean. **However, a key-name mismatch makes the "Customers" tile on the dashboard silently broken**: the backend returns `customer_count` (singular — `DashboardController.php:45`), but the frontend type and consuming code both read `customers_count` (plural) — `types/index.ts:149` and `routes/admin.index.tsx:61`: `{ label: 'Customers', value: data?.customers_count, ... }`. Since `apiFetch` does no runtime shape validation, this silently renders `undefined` in production. No test catches it because `DashboardTest.php`'s assertions only check `total_sales` and `orders_count`, never the customer count key. Not fabricated data — just broken data, which is arguably the same problem from a different angle. |
| 6 | Admin customer list: both routes exist and are wired | ⚠️ | `routes/admin.customers.tsx` and `routes/admin.customers.$customerId.tsx` both exist, both call real queries (`customersQuery`/`customerQuery` → `getCustomers`/`getCustomer` → `/admin/customers`, `/admin/customers/{id}`), both correctly typed against `AdminCustomer` (`types/index.ts:189-199`), backend `CustomerController` (`withCount('orders')`, `withSum('orders','total')`) matches the frontend's expected `orders_count`/`orders_sum_total` fields exactly. **But two real gaps:** (a) **`src/routeTree.gen.ts` — the committed, checked-in generated route file — does not register either route.** `grep -c customers src/routeTree.gen.ts` → `0`. Running `npx tsr generate` (verified live, then reverted) restores 62 lines and both routes. Root cause: merge commit `8b5f84b` ("Merge branch 'main' into dev") deleted 53 lines from this file, silently reverting a version that *did* have the routes (added in `2e67bd7`) back to a stale one from `main` that didn't. Because the TanStack Start Vite plugin (`tanstackStart()` in `vite.config.ts:16`) regenerates this file automatically on `vite dev`/`vite build`, the routes likely still work in an actual dev/build session — but the file checked into git right now is stale, and it directly causes 6 real `tsc --noEmit` errors (§2). (b) There is **no link to `/admin/customers` anywhere in the admin UI** — `AdminLayout.tsx`'s `nav` array (`:17-24`) has Overview/Products/Categories/Orders/Sales analytics/Messages, but no Customers entry. The pages exist and work if you type the URL, but nothing in the app points to them. |
| 7 | Route loaders for SEO (`products.$productId.tsx`, `shop.tsx`, `orders.$reference.tsx`) | ✅ | All three have a real `loader` calling `context.queryClient.ensureQueryData(...)` (`products.$productId.tsx:26-31`, `shop.tsx:71-90`, `orders.$reference.tsx:23-28`). `products.$productId.tsx`'s `head()` (`:36-68`) is genuinely product-specific — real `product.name` in `<title>`/og:title, real `product.description` in description/og:description, real first product image in og:image, with a sane fallback only when `loaderData` is absent. `orders.$reference.tsx`'s `head()` correctly interpolates `params.reference` into the title (`:30-35`) and keeps `noindex`. This closes the single largest SEO gap from the original audit. |
| 8 | Wishlist backend sync: add/remove/toggle branch on auth and hit real API | ✅ | Traced every method in `use-whishlist.tsx`: `add` (`:101-123`), `remove` (`:125-138`), `toggle` (`:140-148`, delegates to add/remove), `setSize` (`:154-170`), `clear` (`:172-183`) — every one branches on `isAuthenticated` and calls `addToWishlist`/`removeWishlistItem`/`syncWishlist` for logged-in users, falling back to local `setLocalItems` only for guests. `items` itself (`:97`) switches source of truth: `isAuthenticated && serverItems ? fromApi(serverItems) : localItems`. This is a real fix, not just `syncToServer` on login — every interaction path was checked, not just the login-time sync. |
| 9 | robots.txt / sitemap.xml exist with real URLs | ✅ | `apps/frontend/public/robots.txt` exists (correct filename), disallows `/admin`, `/checkout`, `/cart`, `/orders/`, references the sitemap. `apps/frontend/public/sitemap.xml` exists with 20 real URLs: 4 static pages, 4 real category filter URLs, 12 real product slugs pulled from the live API by `scripts/generate-sitemap.ts` (fetches `/products` and `/categories` at generation time — not hardcoded). **Caveat:** this is a manually-run generator (`pnpm generate-sitemap`), not wired into the build pipeline — the checked-in `sitemap.xml` is a point-in-time snapshot that will drift as products are added/removed unless someone remembers to re-run it (or it gets added to a deploy/CI step). Not a defect relative to what was asked, but an operational note worth having on record. |

---

## 2. Test suites

### Backend — `make test`

```
Tests:    114 passed (233 assertions)
Duration: 11.73s
```

**114/114 passed, zero failures.** This is close to but slightly under the ~115+ estimate in the brief (111 baseline + 3 order-transition tests + 2 IP-verification tests + 1 by_month test = 117 by that arithmetic; actual is 114 — likely the baseline estimate of 111 was itself approximate). All of the specifically-called-out new tests are present and passing:
- `OrderTest.php`: "lets an admin move an order through valid transitions", "rejects an invalid order status transition", "rejects skipping straight from pending to delivered"
- `MpesaPaymentTest.php`: "accepts a callback from an allowlisted IP...", "rejects a callback from a non-allowlisted IP..."
- `DashboardTest.php`: "includes monthly revenue in sales analytics" (asserts `by_month` is non-empty with `month`/`revenue` keys)

No new failures, no skipped tests, no risky patterns (e.g. no failing test silently marked `->skip()`).

### Frontend — `npx tsc --noEmit`

**Not clean — 6 errors, all one root cause:**

```
src/routes/admin.customers.$customerId.tsx(12,38): error TS2345 — "/admin/customers/$customerId" not assignable to keyof FileRoutesByPath
src/routes/admin.customers.$customerId.tsx(23,11): error TS2339 — Property 'customerId' does not exist on params union
src/routes/admin.customers.$customerId.tsx(31,15): error TS2322 — "/admin/customers" not assignable to Link 'to' union
src/routes/admin.customers.tsx(17,38): error TS2345 — "/admin/customers" not assignable to keyof FileRoutesByPath
src/routes/admin.customers.tsx(63,25): error TS2322 — "/admin/customers/$customerId" not assignable to Link 'to' union
src/routes/admin.customers.tsx(64,35): error TS2353 — 'customerId' does not exist in ParamsReducerFn
```

All six stem directly from item 6(a) above: the stale `routeTree.gen.ts` doesn't know these routes exist, so every typed reference to them (`createFileRoute('/admin/customers')`, `<Link to="/admin/customers/$customerId">`, `Route.useParams().customerId`) fails to typecheck against the generated route-union types. **Confirmed the fix**: running `npx tsr generate` (tested live, then reverted with `git checkout`) regenerates the file and these 6 errors disappear. The underlying route code is correct; the committed build artifact is what's stale. Whoever runs `pnpm dev` or `pnpm build` locally will not see this (the TanStack Start Vite plugin regenerates on the fly), but anyone running `tsc --noEmit` against a fresh clone without first starting the dev server — including CI, if it has a separate typecheck step — will see exactly this failure.

---

## 3. Independent pass — areas outside session 1's scope

Auth, cart, catalog CRUD, messages, CORS/rate-limiting config, and the remainder of `lib/api.ts` were re-audited from scratch (not just re-checking session-1 items). Findings, all independently re-verified against source after the initial pass:

| Area | Status | Evidence |
|---|---|---|
| Auth controllers (register/login/logout/reset/verify) | ✅ | No new issues — enumeration-safe reset, no obvious mass-assignment, admin role never settable via registration. |
| Cart (guest + logged-in + merge) | ✅ | No new issues — ownership checks intact. |
| Catalog CRUD (products/categories/materials/sizes) | ✅ | No new issues. |
| **Contact message → account linking** | ❌ | **New bug.** `MessageController::store` (`:41`) sets `$message->user_id = $request->user()?->id`, but `Route::post('/messages', ...)` (`routes/api.php:130`) has **no middleware at all** — not even `auth.optional`. With no middleware, `$request->user()` resolves via the default `web` (session) guard, which never inspects the `Authorization: Bearer` header — exactly the failure mode `OptionalSanctumAuth.php`'s own docblock (`:9-21`) describes as the reason that middleware exists for cart routes. Since it isn't applied here, `user_id` is **always null**, even when a logged-in customer submits the contact form. Messages from known accounts never get linked to them. |
| **Global API rate limiting** | ❌ | `bootstrap/app.php:15-30` never calls `$middleware->throttleApi()`. Laravel's `Middleware::api()` (`vendor/laravel/framework/.../Configuration/Middleware.php:495-497`) only adds `throttle:{$this->apiLimiter}` to the `api` group if `$apiLimiter` is non-null, and `$apiLimiter` (`:119`) has no default — confirmed by reading the vendor source directly. **Result: the entire `api` middleware group has zero throttling.** Only `/payments/mpesa/initiate` and `/payments/card/initiate` carry an explicit `throttle:5,1` (`routes/api.php:141,146`). `/auth/login`, `/auth/register`, and `/auth/forgot-password` are completely unthrottled — open to credential stuffing, registration spam, and password-reset email bombing. |
| Sanctum token expiration | ⚠️ | `config/sanctum.php:53`: `'expiration' => null` — tokens never expire. Combined with the unthrottled login endpoint above, a brute-forced or leaked token has no time-boxing. |
| `.env.example` secrets hygiene | ⚠️ | `.env.example` (pre-existing from an earlier commit, not touched this session) contains populated-looking values for `MPESA_CONSUMER_KEY` (48 chars), `MPESA_PASSKEY` (64-char hex), `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY` (`sk_t.../pk_t...` — Paystack's real test-key prefix format) rather than placeholder text like `your_key_here`. These read as genuine Safaricom/Paystack **sandbox/test** credentials, not production secrets, and the real `.env` is correctly gitignored (`apps/backend/.gitignore:3`). Low severity since they're test-mode keys, but committing real-shaped values into a template trains contributors to do the same with real ones later — worth rotating and replacing with placeholder text regardless of current severity. |
| CORS config | ✅ | `config/cors.php` — single origin from `FRONTEND_URL` env, no wildcard, `supports_credentials: false` (correct for bearer-token auth, no cookies involved). |
| Rest of `lib/api.ts` (~50 exports) | ✅ | Reviewed end-to-end against `routes/api.php`. No other mock/hardcoded data found; the old `mock()` helper is dead code, unused. |
| Newsletter signup (`routes/index.tsx:235-241`) | ⚠️ | Minor, pre-existing: the homepage newsletter form only calls `toast.success(...)` — no API call exists for it anywhere in the codebase (no backend route, no `lib/api.ts` function). Purely decorative. Not part of this session's scope and not previously flagged, but worth knowing it doesn't actually collect anything. |
| `/about` page content | ❌ (carried over, unfixed) | Still unedited TanStack Start starter boilerplate: `"A small starter with room to grow."` (`routes/about.tsx:13`). Flagged in the original audit, not touched this session. |

---

## 4. Code quality scan — files touched this session

Scanned every file in `git diff d3264a8..HEAD --stat` (the full set touched since the original audit):

| Finding | File:line | Severity |
|---|---|---|
| Leftover `console.log(product)` | `apps/frontend/src/routes/products.$productId.tsx:92` | Low — ships to the browser console in production, not a functional bug, but is exactly the kind of debug leftover this scan is meant to catch. |
| Garbled/stray comment — mid-sentence code fragment left inside a docblock | `apps/backend/app/Services/Paystack/PaystackService.php:27-30` — reads "`(required for PCI compif ($this->secretKey === '') { $this->secretKey = config('services.paystack.secret'); }liance).`" | Low — doesn't affect compilation (it's inside a `/** */` block), but is visibly broken prose, evidence of an editing artifact where old code was pasted mid-word into a comment and never cleaned up. |
| `dd()`/`var_dump()`/`dump()` in backend touched files | none found | — |
| `console.log` elsewhere in touched frontend files | none found beyond the one above | — |
| TODO/FIXME in touched files | none found | — |
| Stray character in wishlist "Move to bag" button | **already fixed** — `routes/wishlist.tsx:162` reads cleanly, matches commit `2e67bd7`'s stated purpose | — |
| Dead/unused imports in touched files | `eslint` run against all touched route/hook files found no unused-import violations. It did flag several pre-existing style-only issues (`@typescript-eslint/no-unnecessary-condition` on optional chains that are provably non-nullish, `import/consistent-type-specifier-style`) in `use-whishlist.tsx`, `products.$productId.tsx`, `admin.customers.$customerId.tsx`, and `checkout.index.tsx` — none of these are bugs, dead code, or debug leftovers; they're lint-strictness nitpicks not worth a line item here. | — |

---

## Still open

1. **Paystack backend calls the wrong live API endpoint** (`/transaction/initiate` instead of `/transaction/initialize`) — currently masked by a test that fakes the same wrong URL. Card payments will 404 against the real Paystack API in production. **Highest-priority fix.**
2. **Admin dashboard "Customers" tile is silently broken** — backend key `customer_count` vs frontend key `customers_count`. One-line fix on either side.
3. **`routeTree.gen.ts` is stale in git** — missing the admin/customers route registration, causing 6 `tsc --noEmit` errors. Regenerate with `npx tsr generate` and commit the result; consider adding a CI check that fails if the committed file doesn't match a fresh generation.
4. **No link to `/admin/customers` from the admin UI** — add it to `AdminLayout.tsx`'s nav array.
5. **Global API has no rate limiting** — `/auth/login`, `/auth/register`, `/auth/forgot-password` are wide open. Add `$middleware->throttleApi()` in `bootstrap/app.php` at minimum; consider a tighter limiter specifically on auth routes.
6. **Sanctum tokens never expire** (`config/sanctum.php:53`) — combine with #5 being unfixed, this raises the stakes of any credential leak.
7. **Contact messages never link to the sending account** even when the sender is logged in — `/messages` route needs the `auth.optional` middleware.
8. `.env.example` has real-shaped sandbox/test credentials — replace with placeholder text.
9. `/about` page is still unedited starter-template boilerplate (carried over from the original audit, untouched this session).
10. Sitemap generation is a manual script, not part of the build/deploy pipeline — will drift from the real catalog over time.
11. Minor code-quality leftovers: `console.log` in `products.$productId.tsx:92`, garbled comment in `PaystackService.php:27-30`.

## Newly found (not in the original audit, discovered during this pass)

- Paystack wrong endpoint URL (§1.1) — the original audit couldn't have caught this since no Paystack backend existed yet.
- Dashboard `customer_count`/`customers_count` key mismatch (§1.5).
- Stale `routeTree.gen.ts` / admin-customers unreachable via typecheck and (potentially) via a build that skips regeneration (§1.6, §2).
- Missing admin nav link to Customers (§1.6).
- No global API rate limiting; Sanctum tokens don't expire (§3).
- Contact messages never attributed to logged-in senders (§3).
- `.env.example` secrets hygiene (§3).
- Decorative (non-functional) newsletter signup form (§3) — very low priority, noted for completeness.

## What checks out cleanly

Order transition guard, M-Pesa IP verification default, reviews list, wishlist backend sync (full method-by-method trace), all three SEO route loaders including the product-specific `head()`, robots.txt/sitemap.xml, auth/cart/catalog CRUD controllers, CORS config, and 114/114 backend tests passing. The session's fixes were real and mostly correctly implemented — the issues above are specific, narrow gaps, not signs the fixes were faked or superficial.
