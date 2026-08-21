# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**HyperLocal** — a marketplace connecting Kenyan street vendors to nearby customers. Flask API + React SPA.

The defining constraint is the **freshness timer**: a vendor is only discoverable if they checked in within the last 3 hours. Every customer-facing query filters on `VendorLocation.auto_close_at > utcnow()`. If a vendor "disappears from the map", that timer is the first thing to check.

## Commands

### Backend (`backend/`, venv at `backend/venv`)

```bash
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

flask db upgrade                  # apply migrations
flask db migrate -m "message"     # generate a migration after changing models.py

python run.py                     # dev server on :5000 (debug, hardcoded 'development' config)
python scheduler.py               # separate always-on worker; run in its own terminal
python seed.py                    # bootstrap admin only (env: ADMIN_EMAIL/ADMIN_PASSWORD)
python seed_dev.py --reset        # full dev dataset; all accounts use Password123
```

`flask` CLI commands need `FLASK_APP=run.py` (or an equivalent env var) in the shell.

### Frontend (`frontend/`)

```bash
npm install
npm run dev                      # Vite on :5173
npm run dev -- --port 5174       # if 5173 is taken by another project
npm run build
npm run lint
```

`npm start` in package.json invokes `react-scripts` and is a leftover — it does not work. Use `npm run dev`.

**Lint baseline: `npm run lint` exits non-zero with 12 errors / 2 warnings** (verified 2026-08-21). All remaining ones are unused-variable and `exhaustive-deps` noise in `landingPage.jsx`, `VendorProfile.jsx`, `viewOrders.jsx`, `orderPage.jsx`, `VendorCheckIn.jsx`, `ForgotPassword.jsx`, and `newVendorRegister.jsx`. Compare counts before and after your change rather than expecting a clean run — none of these are behavioural.

### Tests

```bash
cd backend && source venv/bin/activate
pytest tests/test_backend.py
pytest tests/test_backend.py::test_freshness_filter    # single test
```

**80 unit tests, all passing** (verified 2026-08-21): freshness/radius/inventory filtering, role enforcement, the full payment + callback lifecycle, password reset, CORS, and auth.

There is also a **live endpoint smoke suite** covering every route end to end:

```bash
python run.py                     # terminal 1
python tests/smoke_endpoints.py   # terminal 2  -> 56/56 passed
```

It hits the real app over HTTP (auth, role rejection, payments, admin) and is safe to
re-run: every mutating call is uniquely keyed per run. Use it after touching routes;
`test_backend.py` alone will not catch a serialisation bug that only shows over the wire.

The suite builds its app with `create_app('testing')`, which pins SQLite in-memory. **Never switch the test database by assigning `app.config['SQLALCHEMY_DATABASE_URI']` after `create_app()`** — Flask-SQLAlchemy binds the engine inside `init_app()`, so the assignment is silently ignored and the suite runs against the real `DATABASE_URL`. Teardown calls `db.drop_all()`, so that mistake destroys the dev database. `test_suite_is_isolated_from_the_real_database` guards against it; do not delete it.

M-Pesa is monkeypatched via the `mock_stk` fixture — tests must never hit Safaricom.

### M-Pesa local testing

Safaricom cannot reach localhost. Run `ngrok http 5000`, put the forwarding URL in `MPESA_CALLBACK_URL` in `backend/.env` (as `https://<id>.ngrok-free.app/api/customer/callback`), and restart Flask. Without this, `/pay` succeeds but the callback never arrives and orders sit at `Pending Payment` forever.

## Architecture

### Data model (`backend/app/models.py`)

Eight tables, deliberately flat:

- **`User`** — one table for all three roles (`customer` / `vendor` / `admin`), discriminated by `role`. `password_hash` and `phone_number` are nullable so Google sign-in users can exist without them. Vendor fields (`business_name`, `storefront_image_url`) live here too.
- **`VendorLocation`** — 1:1 with a vendor user. **The menu is a JSON column, not a table.** There is no `MenuItem` model; menu items are dicts with `name` / `desc` / `price` / `image`, written wholesale on each check-in. `check_in()` sets `is_open` and `auto_close_at = utcnow() + 3h`.
- **`Order`** — `HL-XXXXXX` number, items as JSON, `customer_latitude` / `customer_longitude` captured at checkout for vendor routing, and a **nullable `customer_id`** (see Order lifecycle below).
- **`Favourite`** / **`Review`** — go-live alerts and post-collection ratings.
- **`Address`** — saved delivery spots; coordinates matter more than the label, since the vendor routes to the pin.
- **`Promotion`** — vendor discount codes, unique per vendor rather than globally.
- **`Transaction`** — the M-Pesa side. `checkout_request_id` is the join key that lets an async Safaricom callback find its row.

Because the menu is JSON, item search in `/customer/search` is a **Python loop over every open vendor**, not SQL. Same for distance: `auto_close_at` is filtered in SQL, then [haversine](backend/app/utils/geospatial.py) runs in Python and drops anything past 5 km.

### Payment flow

This is the most load-bearing sequence in the app. It spans four files:

1. `paymentDetails.jsx` → `mapService.initiatePayment()` → `POST /api/customer/pay`
2. [`customer_routes.py`](backend/app/routes/customer_routes.py#L123) creates the `Order` as `Pending Payment`, `flush()`es to get its id, then calls `MpesaHandler.initiate_stk_push`
3. On `ResponseCode == '0'` a `PENDING` `Transaction` stores the `CheckoutRequestID`; otherwise a `FAILED` row is written and the order marked `Payment Failed`
4. Safaricom POSTs [`/api/customer/callback`](backend/app/routes/customer_routes.py#L210) → row found by `CheckoutRequestID` → both `Transaction` and `Order` flip
5. `PaymentSuccess.jsx` polls `/payment-status/<id>` every 3s, max 20 attempts

`/payment-status/<identifier>` accepts **either** an `HL-` order number or a raw checkout id, and deliberately returns `PENDING` when nothing is found so the write/read race doesn't surface as a failure.

### Frontend state

`main.jsx` nests providers in a required order: `GoogleOAuthProvider → BrowserRouter → AuthProvider → LocationProvider → CartProvider`.

- **`AuthContext`** — the source of truth for route guards. Reads/writes localStorage keys **`token`** and **`user`**. Anything that logs a user in must call `login(token, user)`, not just write localStorage.
- **`CartContext`** — enforces single-vendor carts, prompting `window.confirm` to clear on switch. Persisted to `local_vendor_cart`.
- **`LocationContext`** — exposes **`userLocation`** with `{ lat, lon }`. Note `lon`, not `lng`; the two conventions are mixed across the codebase and are a recurring source of bugs.

Route guards: `ProtectedRoute` (token + optional `roles`, preserves `from` for post-login return) and `RedirectIfVendor` (pushes logged-in vendors to their dashboard).

`services/api.js` is the single axios instance; its interceptor attaches the bearer token from either `token` or a `user.token` field. Prefer adding methods there over calling axios directly.

### External services

Nominatim (address geocoding, in `VendorCheckIn`) and OSRM (`router.project-osrm.org`, driving route in `viewOrders`) are called **directly from the browser**, not proxied. Cloudinary uploads and M-Pesa go through the backend.

## Conventions

- Backend returns `{'success': True, ...}` on most endpoints, `{'error': '...'}` on failure. Not universal — check the specific route.
- Timestamps are naive `datetime.utcnow()` throughout. Do not mix in aware datetimes.
- Tailwind theme colors are defined in `frontend/tailwind.config.js` (`primary`, `secondary`, `accent`, …), but most pages use raw `orange-*` / `gray-*` utilities instead. Match the surrounding file rather than the config.
- Frontend page filenames are inconsistently cased (`landingPage.jsx`, `VendorLogin.jsx`, `newVendorRegister.jsx`). Import paths are case-sensitive on Linux — copy the exact existing name.

## Features added on top of the MVP

Four subsystems were layered on after the original build. Each has tests; the
patterns below are load-bearing, not incidental.

### Vendor analytics — `GET /api/vendor/analytics`

`app/utils/analytics.py` derives everything from existing `Order` rows, so it needed
no schema change. **Revenue counts only orders that actually completed** — summing
every order regardless of status silently inflates revenue with failed and pending
payments, which is exactly what the hardcoded dashboard used to imply.

### Order lifecycle — `PATCH /api/vendor/order/<id>/status`

`app/utils/order_status.py` is a **state machine, not a free-text field**:

    Pending Payment ─┬─> Paid ─> Preparing ─> Ready ─> Collected
                     └─> Payment Failed

Transitions are validated server-side and an illegal one returns **409 with the
`allowed` next steps**, so the client never duplicates the rules. The status is
customer-visible, so a vendor must not be able to skip to Collected.

`Order.customer_id` is **nullable on purpose**: `/customer/pay` is reachable without a
token (guest checkout), so a customer is attached only when a JWT is present. Do not
make it non-nullable without first requiring login to order.

### Reviews

`Review.order_id` is **unique**, and `POST /api/customer/orders/<n>/review` only
accepts a review when the order is `Collected` *and* owned by the caller. That pairing
is the whole trust mechanism — without it the ratings are decoration. `nearby` and
`search` carry `rating` / `rating_count`; an unrated vendor returns `null`, never `0`
(a zero would render as "rated badly").

### Favourites + go-live alerts

`Favourite` has a unique `(customer_id, vendor_id)` constraint, so a double-follow is
impossible at the database level rather than depending on the route to check first.
Check-in calls `notify_followers_of_checkin`, which is **best-effort by design**: a
vendor going live matters more than an email, so mail failures are logged and
swallowed. `test_checkin_survives_a_mail_failure` locks that in.

## Accounts, addresses, promotions

### One account panel, two roles

`components/account/AccountPanel.jsx` is shared by the customer and vendor profile
screens and talks to `GET/PUT /api/auth/me` plus `POST /api/auth/change-password`.
Keeping it in one component means a fix to the password flow cannot land for one role
and silently miss the other.

**`PUT /api/vendor/profile` used to accept `username` and `password`, ignore them, and
return success** — so a vendor could "change" their password and nothing happened. That
route now owns only the business fields and returns **400 pointing at `/auth/me`** for
anything else. Do not re-add identity fields to it.

Uniqueness on username/email/phone is checked **before any mutation**, so a clash
returns a clean 409 instead of a half-applied update or an IntegrityError 500.

### Saved addresses

One default per customer is enforced in the route: setting a new default clears the
others, the first address saved becomes the default automatically, and deleting the
default promotes another. `components/map/LocationPicker.jsx` pairs the typed landmark
with a real coordinate — a phrase like "blue gate" only helps someone who already knows
the area, so the vendor routes to the pin and reads the words on arrival.

### Promotions

Codes are unique **per vendor**, not globally, so two stalls can both run `LUNCH10`.
Discounts are capped at 70% (a 100% typo would let anyone eat free).

Two rules that must not be relaxed:

- **The client sends a code, never a price.** `/customer/pay` re-looks-up the promo and
  recomputes the total. `promo/preview` shares that code path so the quoted number and
  the charged number cannot drift apart.
- **Redemptions are counted in the M-Pesa callback, not at order creation** — otherwise
  an abandoned checkout burns a limited-use code. `test_redemption_counts_only_after_payment_succeeds`
  pins this.

### Role-aware navigation

The landing page derives `showVendorEntry` / `showAdminEntry` from the signed-in role in
one place, so the desktop nav, mobile menu and footer cannot drift. A signed-in customer
sees no vendor sign-up or admin entry; anonymous visitors still see both, since that is
how a vendor finds their way in.

## Seeding

```bash
python seed_dev.py            # add/refresh seed data
python seed_dev.py --reset    # wipe everything first
```

10 Nairobi vendors with real Kenyan street-food menus (7 open with staggered timers,
2 expired, 1 never checked in), 4 customers, an admin, and ~14 orders across
Paid / Pending Payment / Payment Failed with matching transactions. Every account
uses `Password123`.

It refuses to run against a non-local `DATABASE_URL` unless `--force` is passed, so it
cannot be pointed at production by accident. `seed.py` (admin only) still exists.

## Frontend design system

The look is defined centrally in `src/index.css` — **not** per page. The palette is
exactly the one in `tailwind.config.js` (`primary #FF6B35`, `secondary #FFD166`,
`accent #118AB2`, `success #06D6A0`, `warning #EF476F`); do not introduce new hues.

Reusable classes: `.panel` / `.panel-hot` (frosted cards), `.btn-ember` / `.btn-ghost`,
`.field`, `.chip-live` / `.chip-closing` / `.chip-dim`, `.rule`, `.stagger` (staggered
entrance), `.skeleton`, `.tabular` (mono numerals for timers and prices), `.snap-rail`,
`.pb-safe` / `.pt-safe` (notch insets).

Type: **Unbounded** display, **Manrope** body, **JetBrains Mono** numerals, loaded in
`index.html`. Prefer these classes over ad-hoc utility stacks so pages stay consistent.

## Map architecture

Three modules back every map surface; `mapPage.jsx` and `landingPage.jsx` both render
the same `LiveMap`, so fix map bugs once.

- **`src/lib/geo.js`** — haversine, bearing, distance/countdown formatting, and
  `clusterPoints()`, a **spatial-hash clusterer**. Bucketing by a zoom-derived grid
  cell makes it O(n) rather than the O(n²) of pairwise clustering, which matters once
  a city of vendors is on screen. Latitude is scaled by `cos(lat)` so cells stay square.
  `urgency()` + `URGENCY_COLOR` are the single source of truth for what "live",
  "closing", "last call" and "closed" mean — marker hue, chip colour and pulse rate all
  read from them.
- **`src/hooks/useLiveLocation.js`** — `watchPosition`-based continuous tracking that
  replaced the one-shot `getCurrentPosition`. Gates readings on accuracy (GPS often
  opens with a 2km cell-tower fix) and on an 8m jitter threshold so markers do not
  vibrate while stationary. Returns `{ lat, lon }`, matching `LocationContext`.
- **`src/components/map/markers.js`** — SVG `divIcon`s, not raster pins, so a marker can
  carry live state: vendor initial, urgency colour, and a beacon ring that pulses faster
  as the window closes. Clustering above z15 is skipped since pins no longer overlap.

Menus arriving from the API are always normalised lists (see below), so
`Array.isArray(vendor.menu)` holds — but keep the guard.

## Recently fixed (2026-08-21)

All of these were repaired in one pass; the notes explain *why* the shape is what it is, so it doesn't get reverted:

- **Test isolation** — added `TestingConfig`; see the Tests section above.
- **`mapPage.jsx` showed no vendors** — `mapService` resolves to plain **arrays**; the page was testing `response.success`. Keep the array contract: `landingPage.jsx` and `mapPage.jsx` both rely on it now. Also fixed there: the missing `mapService.searchPlaces` (added, Nominatim), `vendor.menu` is a flat list not `.items`, `distance` is **km** not metres, `updated` not `last_updated`, and `/order/:id` takes `vendor.vendor_id` (the user id) not `vendor.id` (the location row id).
- **Admin dashboard was unreachable** — `AdminLogin` now calls `AuthContext.login(...)`. Anything that logs a user in *must* go through the context; writing localStorage directly leaves `ProtectedRoute` unsatisfied.
- **Password reset** — implemented end to end: `GET/POST /api/auth/reset-password/<token>` (expiry + single-use + 8-char minimum) and `pages/auth/ResetPassword.jsx` at `/reset-password/:token`. The email link is built from `FRONTEND_URL`, no longer hardcoded to localhost.
- **Role enforcement** — every `/api/vendor/*` route now uses `@vendor_required`, including `/upload`, which previously had no auth at all. The decorators cast the JWT identity with `int()`; it arrives as a string from `create_access_token(identity=str(user.id))`.
- **Vendor signup ordering** — because `/vendor/upload` now requires a token, `newVendorRegister.jsx` registers → logs in → *then* uploads the storefront image and PUTs it to `/vendor/profile`. A failed upload no longer discards a successful signup. **Do not move the upload back above `register()`.**
- **CORS** — `CORS_ORIGINS` in config; the `"*"` is gone (it was paired with `supports_credentials: True`, which is the dangerous combination). Add deployed origins via `FRONTEND_URL`.
- **`check_in()`** read the clock twice, so the window was 3h minus microseconds. Single `now` variable now.
- **`ai_helper.py`** used `openai.ChatCompletion.create`, removed in openai ≥ 1.0. Now the modern client, built lazily so a missing key can't break import, with a fallback string on any failure.
- **Dead code removed** — `useActivityTracker.js` (broken import, nonexistent endpoint), `vendorAPI.updateOrderStatus` (no backend route), the duplicate `create_app()` in `routes/__init__.py`. `customerAPI.getVendors`/`getNearbyVendors` now point at `/customer/nearby`, which actually exists.
- **`seed.py`** no longer passes the nonexistent `owner_name` column; `Procfile` and `backend/.env.example` are now populated.

### Also fixed (same day, second pass)

- **`/api/admin/logs` 500'd whenever any transaction existed** — `admin_routes` reads
  `t.vendor`, but `Transaction` had no such relationship. Added, plus removed a fallback
  to a `created_at` column that does not exist on that model.
- **Malformed menus could crash the map.** `menu_items` is schemaless JSON and older rows
  hold `{"items": [...], "prices": {...}}`. Search silently matched nothing against that
  shape, and `vendor.menu?.slice()` *throws* on a dict (optional chaining guards a null
  `menu`, not a missing `.slice`). Everything now goes through
  `app/utils/menu.py::normalise_menu_items`, so any historical shape degrades to a list.
  **Normalise at the route boundary, never hand raw `menu_items` to the frontend.**
- `check_in()` read the clock twice, so the window was 3h minus microseconds.

### Also fixed (third pass)

- **Auth state was hydrated one render too late.** `AuthContext` read `token`
  synchronously from localStorage but restored `user` in a `useEffect`, while
  `ProtectedRoute` requires both. On the first render of any protected page `user` was
  still null, so **refreshing or deep-linking a protected route bounced you to
  `/login`** — and from there vendors were pushed to the dashboard. Both values are now
  read synchronously in `useState` initialisers. If you add more auth state, initialise
  it the same way.
- `/api/admin/logs` 500'd whenever a transaction existed (`Transaction` had no `vendor`
  relationship).

### Kanban audit (2026-08-21) and the fixes it forced

All 36 closed issues were re-verified against the running app. 33 pass. The audit
turned up three real defects that had been marked Done:

- **`/search` and `/nearby` had drifted apart.** Search emitted `menu_items` while
  the client reads `vendor.menu`, and omitted `updated` and `cheapest_item`. The
  `Array.isArray(vendor.menu)` guard turned that into a silently **empty menu**, so
  searching "samosa" returned a card that did not list the samosa, with no price and
  no freshness countdown. Both routes now build their payload through
  `_serialise_vendor()` in `customer_routes.py`; `test_search_and_nearby_return_the_same_vendor_shape`
  compares the two key sets so they cannot drift again. **Do not hand-roll a vendor
  dict in a route.**
- **`/pay` had no rate limiting**, which kanban AUTH05 and ORDER-PAY both required.
  Every accepted call sends a real STK prompt to a real handset, so the abuse is the
  prompt itself. `app/utils/rate_limit.py` throttles on the **phone number** (protects
  the victim) and the **caller's IP** (stops one attacker cycling numbers): 5 per phone
  and 20 per IP per 10 minutes, returning 429 with `Retry-After`. Rejected calls are
  not recorded, so hammering cannot extend a lockout. State is per-process and
  in-memory - with several workers the limit multiplies, which is the accepted trade
  for not needing Redis on a free tier.
- **The test suite depended on a developer's personal Gmail.** Flask-Mail requires a
  sender even when `MAIL_SUPPRESS_SEND` is on, and the base `Config` takes it from
  `MAIL_USERNAME` in `.env`; nine tests 500'd with "does not specify a sender" on a
  checkout without one. `TestingConfig` now pins a dummy sender. The suite is hermetic.

`mock_stk` returns a fixed `CheckoutRequestID` and that column is UNIQUE, so any test
that pays more than once must use **`mock_stk_unique`** - otherwise the second call
500s on an IntegrityError that looks like a payment bug.

Three items remain unmet, all deliberate rather than missing work:

- **#25 `POST /vendor/login`** and **#26 `POST /vendor/update-location`** name routes
  that do not exist. The behaviour lives at `/api/auth/login` and `/api/vendor/checkin`.
  Rename the cards rather than adding alias routes.
- **#34 asks for `sessionStorage`**; `AuthContext` uses `localStorage`, so a vendor is
  not logged out every time they open a tab. Changing it would be a UX regression -
  neither store defends against XSS.

### backend/.env is easy to destroy by switching branches

`backend/.env` was **tracked** on old `main` (e0a8394) and deleted later. Checking out
or fast-forwarding across that boundary **removes the file from your working tree**,
taking any local-only values (mail, Google, OpenAI) with it - they are in no blob and
cannot be recovered from git. Back it up before any branch switch that crosses those
commits. The fullest historical version is blob `818a57b7` (13 settings, leaked - the
`SECRET_KEY` and `JWT_SECRET_KEY` there must never be reused).

### Still open

- The `OPENAI_API_KEY` in `.env` returns 401. AI descriptions fall back to canned text until it's replaced.
- Frontend has no test framework; only the backend is covered. Verify UI changes by
  screenshotting the running app — `npm run build` passing proves nothing about render
  (a missing `useReducer` import built fine and would have crashed at runtime).
- Only `landingPage.jsx` and `mapPage.jsx` have been rebuilt on the design system. Other
  pages inherit the global type/atmosphere and look coherent, but still use ad-hoc
  utilities rather than `.panel` / `.btn-ember`.

### Secrets — read before deploying

`backend/.env` values were committed to this **public** repo in six historical blobs and
remain reachable on GitHub. `SECRET_KEY` and `JWT_SECRET_KEY` have been rotated;
**Cloudinary and M-Pesa credentials had not been at last check** and must be rotated in
their dashboards. History has not been purged. Never put a secret in a `VITE_*` variable
— those are compiled into the public JS bundle.

## Security notes for changes in this area

- `vendor_required` is applied to every `/api/vendor/*` route (see above). Keep it that way when adding routes.
- Admin routes check `get_jwt()['role'] == 'admin'` inline, relying on a claim added at login. `admin_required` in [`utils/decorators.py`](backend/app/utils/decorators.py) is the DB-backed equivalent if you prefer it.
- CORS is an explicit allowlist with `supports_credentials: True`. Never reintroduce `"*"` alongside credentials.
- `backend/.env` is gitignored and untracked; history shows secrets were deliberately purged. Keep it that way.
