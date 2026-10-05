# SERA Management web pages

Static pages for SERA Management: a vendor admin panel and a customer
self-service portal. Plain HTML, CSS and vanilla JavaScript; no build step,
no frameworks, no external scripts.

```
web/
  index.html          landing page, links to the customer portal only
  shared.css          Sera theme (dark by default, light via prefers-color-scheme), RTL rules
  shared.js           window.Sera: API calls, formatting, dialogs, toasts, i18n
  admin/index.html    vendor admin panel (sera-admin function): customers + diagnostics
  portal/index.html   customer portal (sera-customer function)
```

## Languages (English / Hebrew)

Both pages have an `EN / עב` toggle in the header. The choice is stored in
`localStorage["sera.lang"]` (`"en"` or `"he"`); until the user picks one, the
default comes from `navigator.language(s)` (`he*` -> Hebrew, otherwise English)
and nothing is written. Hebrew sets `<html lang="he" dir="rtl">`; the layout
uses flex/grid and logical CSS properties, and `shared.css` keeps hashes, keys,
URLs and stack traces left-to-right inside RTL pages. Product names (SERA,
NinjaTrader, Stripe) stay Latin in both languages.

Implementation (`shared.js`, exposed on `window.Sera`):

- `t(key, params)`: looks the key up in the active dictionary, falls back to
  English, then to the key itself. `{name}` placeholders are substituted.
- `applyLanguage(code, {persist, force})`: sets `<html lang dir>`, rebuilds the
  `he-IL` / `en-US` date formatters, re-applies every `data-i18n` (text),
  `data-i18n-placeholder` and `data-i18n-title` (title + aria-label) node,
  marks the active `[data-sera-lang]` button and fires a `sera:lang` event on
  `document` when the language changed. Pages listen with `Sera.onLanguage(fn)`
  and re-render their dynamic HTML (lists, detail panel, diagnostics).
- `bindLangToggle()`: wires `[data-sera-lang="en|he"]` buttons.
- `getLang()`, `i18n.extend({en:{...}, he:{...}})`: each page adds its own
  keys (`admin.*`, `portal.*`) on top of the shared ones (`err.*`, `rel.*`,
  `status.*`, `dlg.*`, `common.*`).
- `fmtDate`, `fmtDateTime` and `relative` follow the active locale, so
  "Oct 5, 2026 · in 12 days" becomes "5 באוק׳ 2026 · בעוד 12 ימים".

The English strings are the ones the pages shipped with before the toggle
existed; they are unchanged.

## Deployment (GitHub Pages)

1. Push the `web/` folder to a **public** repository (GitHub Pages on the
   free plan requires a public repo).
2. Repository settings -> Pages -> "Deploy from a branch", branch `main`,
   folder **`/web`** is not selectable directly: either
   - publish from a branch whose root *is* the contents of `web/` (for
     example copy `web/*` to a `gh-pages` branch), or
   - keep `web/` in the main branch and set up a Pages workflow that uploads
     `web/` as the Pages artifact (`actions/upload-pages-artifact` with
     `path: web`).
3. The pages are then served at `/` (landing), `/portal/` and `/admin/`.

All paths inside the pages are relative (`../shared.css`, `portal/`), so the
site works at a repository sub-path as well as a custom domain.

The admin page has `noindex` and is not linked from the landing page, but it is
still a public URL. Its only protection is the admin token: keep the token
secret and consider restricting who knows the `/admin/` address.

## Configuration

- API base URL: default `https://oljcnfcvjvpkwcabmsjd.supabase.co`. Both
  pages have a gear button and a "Change server" footer link; the value is
  stored in `localStorage["sera.base"]` (removed when it equals the default).
- Admin token: entered once in the Connect form, stored as JSON in
  `localStorage["sera.admin"]` (`{token, saved_at}`), removed by Disconnect.
  It is sent only as the `x-sera-admin-token` header, never in the URL.
- Product key (portal): kept in `sessionStorage["sera.portal.key"]` only, so
  it is forgotten when the tab closes. "Forget key" clears it.
- Language: `localStorage["sera.lang"]` (`en` | `he`), absent until the user
  picks a language with the header toggle.

All requests use a 15 second timeout. Errors are shown as friendly text; the
request body and secrets are never logged.

## API contract summary

All endpoints are Supabase Edge Functions: `POST {base}/functions/v1/<fn>`
with `content-type: application/json`, CORS enabled. Responses are
`{ok:true, ...}` or `{ok:false, error, message}`.

The pages send no Supabase `apikey`/`Authorization` header, so the functions
must be deployed with JWT verification disabled (`verify_jwt = false`).

### `sera-admin` (header `x-sera-admin-token: <token>`)

| action | body | response |
|---|---|---|
| `list` | `{query?}` | `{entitlements:[...]}` |
| `get` | `{entitlement_id}` | `{entitlement, devices, product_keys, leases, audit}` |
| `create_entitlement` | `{customer_email, months (1-36), max_devices (1-20), note?}` | `{entitlement, product_key}` (key shown once) |
| `reissue_key` | `{entitlement_id}` | `{entitlement_id, product_key}` (key shown once) |
| `extend` | `{entitlement_id, months}` | `{entitlement}` |
| `revoke` | `{entitlement_id, reason?}` | `{entitlement}` |
| `release_seat` | `{entitlement_id, device_hash}` | `{released}` |
| `telemetry` | `{limit (1-200, page sends 50), kind?: "crash"\|"startup"}` | `{events:[...], last_7_days:{crashes, startups}}` |

Entitlement fields: `id, customer_email, plan, status (active|past_due|canceled|expired),
current_period_end, max_devices, stripe_customer_id, stripe_subscription_id, note,
created_at, updated_at, active_devices, total_devices`.

`get` sub-records:

- `devices[]`: `id, device_hash, device_name, app_version, first_seen_at, last_seen_at, disabled_at`
- `product_keys[]`: `id, created_at, redeemed_at, revoked_at`
- `leases[]`: `id, activation_id, device_hash, not_before, expires_at, key_id, issued_at`
- `audit[]`: `id, at, actor, action, device_hash, details` (rendered newest first)
- `legal_acceptances[]`: `id, device_hash, legal_version, app_version, language, accepted_at`
  (rendered as the "Terms accepted" list: device short = first 8 chars of the
  hash, terms version, app version, language, date)

`telemetry` (Diagnostics tab): `events[]` are `id, at, kind ("crash"|"startup"),
app_version, os_version, device_hash_short, exception_type, message, stack,
details`. The tab shows the two 7-day counters, a kind filter (all / crashes /
startups, sent as `kind`), a table (time, kind badge, app version, OS, device
short, exception type, message) and a per-row "Stack" button that expands the
escaped stack trace in a scrollable monospace block, with `details` (string or
JSON) underneath. The tab loads on first open and on Refresh / filter change.

### `sera-customer` (no auth header; the product key is the credential)

| action | body | response |
|---|---|---|
| `status` | `{product_key}` | `{entitlement, devices, key_last4}` |
| `release_seat` | `{product_key, device_hash_short}` | `{released}` |
| `billing_portal` | `{product_key, return_url}` | `{url}` or `{ok:false, error:"manual_billing"}` |

`status.entitlement`: `status, plan, current_period_end, max_devices, active_devices,
billing ("stripe"|"manual"), customer_email_masked`.
`status.devices[]`: `device_hash_short (first 8 chars), device_name, app_version,
first_seen_at, last_seen_at, disabled_at`.

Error codes handled: `invalid_key`, `rate_limited`, `invalid_request`,
`server_error`, `manual_billing` (portal billing only). HTTP 401/403 without a
JSON body is shown as a rejected token, 404 as "function not deployed",
429 as rate limited, 5xx as a server error.

Product keys are normalised client-side to `SERA-XXXX-XXXX-XXXX-XXXX`
(any case, dashes or spaces accepted; a `SERA` prefix is optional; exactly
16 characters after the prefix are required before a request is sent).

## Links baked into the pages

- Download: `https://github.com/Alon225/sera-releases/releases/latest`
- Support: `alonjbtw@gmail.com`
- Footer: "SERA Management · not affiliated with NinjaTrader LLC"
