# Tarkaari · ತರಕಾರಿ

Next-day vegetable ordering between apartment residents in Bengaluru and their local vendor. Mobile-first installable PWA in English and Kannada.

- Booking window 10:00–17:00 IST for delivery next morning; vendor accepts by 21:00.
- Payment goes straight from customer to vendor (UPI link or cash). The app never holds money.
- Roles: customer, vendor, admin.

## What's built

| Area | Screens |
|---|---|
| Everyone | Welcome (pick role + language), phone OTP login, WhatsApp join link `/j/<code>` with link preview, offline page |
| Customer | Onboarding (name → apartment → flat → vendor) · Shop with countdown, categories, repeat last order · **Type/speak a list → cart** · Cart · My order (status steps, item availability, change/cancel until 5 pm, read aloud) · Bill + pay by UPI link or cash · Payments · Profile (vendor, invite neighbours, past orders + repeat, language, alerts, help) · Notifications |
| Vendor | Shop setup (photos, apartments, delivery time, payment terms, service charge, **type/speak prices**) · Under review · Today (countdown, next step, totals) · **Buying list: all apartments → per apartment → house by house** · Orders (tap to untick with undo, accept all after 5 pm) · Pack & deliver (actual weight, price chips, bill) · Items & prices (availability, price range, price note, **type/speak prices**, add vegetables) · Apartments (**Share to WhatsApp group**, new link, terms, holidays, add/stop) · Dues (confirm/reject claims, cash received, remind via WhatsApp + in-app, pause/allow) · More/settings |
| Admin `/admin` | Dashboard · Vendors (photos, approve/pause/block) · Apartments (search, merge, remove) · Customers (search, block) · Orders lookup · Reports |
| Background | Notifications created by DB triggers, sent as web push right after each action; daily reminders by Vercel Cron |

## Folder structure

```
messages/                 en.json, kn.json (every UI string, same keys in both)
public/
  sw.js                   service worker: offline page, asset cache, web push
  offline.html            bilingual offline fallback
  icons/  veg/            app icons; vegetable pictures (placeholders for now)
scripts/
  catalogue.mjs           ← edit vegetables here, then `npm run catalogue`
  generate-catalogue.mjs  writes supabase/seed.sql + public/veg/*.svg
  generate-icons.mjs      app icons
  check-messages.mjs      EN/KN key parity
  db-test/                migration, RLS and full-day business-flow tests on plain Postgres
  dev-stack/              Docker-free local Supabase (Postgres + Auth + PostgREST + gateway)
supabase/
  config.toml             local CLI config, test OTP numbers
  migrations/             schema → functions → RLS → storage
  seed.sql                generated catalogue (47 items)
src/
  app/[locale]/           all screens (locale comes from cookie, not URL)
    (customer)/           shop, cart, order, bill, payments, profile
    vendor/(app)/         Today, buy, orders, pack, items, apartments, payments, more
    vendor/setup|review   vendor sign-up before approval
    admin/                admin panel
  app/api/cron/[job]/     scheduled reminders (Vercel Cron)
  app/manifest.ts         web app manifest
  components/             app components + ui/ (shadcn/ui)
  hooks/                  use-undo, use-switch-locale
  i18n/                   next-intl routing, request config, navigation
  lib/time.ts             IST booking-window rules (+ tests)
  lib/list-parser.ts      typed/spoken list → items, quantities, price ranges (+ tests)
  lib/data/               per-request loaders (viewer, customer, vendor)
  lib/actions/            server actions (all writes go through RLS or checked DB functions)
  lib/notify/             notification text, web push fan-out
  lib/supabase/           browser / server / admin (service role) / proxy clients
  proxy.ts                next-intl + Supabase session refresh (Next 16 "proxy" = middleware)
  types/database.ts       generated DB types
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run check` | i18n parity + typecheck + lint + unit tests |
| `npm run build` | Production build |
| `npm run catalogue` | Regenerate seed.sql and placeholder pictures from `scripts/catalogue.mjs` |
| `npm run photo -- <slug> <file> [credit]` | Add a real photo for an item |
| `npm run db:push` | Apply migrations + seed to the linked Supabase project |
| `npm run db:types` | Regenerate `src/types/database.ts` from the linked project |
| `npm run db:test` | Run migrations plus 114 RLS and business-rule checks on a local Postgres (set `PGHOST`, `PGPORT`, `PGUSER`) |
| `npm run stack:setup` / `npm run stack` | Recreate / run the local Supabase-like stack (see below) |

## Running locally without Docker

`scripts/dev-stack` runs Postgres 16, Supabase Auth and PostgREST behind one gateway on `http://127.0.0.1:54321`, the same API the app uses in production.

```bash
npm run stack:setup      # fresh database "tarakari_dev" from the migrations + seed
npm run stack            # start it; prints the .env.local values
npm run dev
node scripts/dev-stack/stack.mjs clock "2026-10-19 17:30+05:30"   # pretend it's 5:30 pm (or "off")
```

Sign in with the test numbers (90000 00001–05, code 123456). Make an admin with
`update public.users set role = 'admin' where phone = '919000000005';` after that number has signed in once.

## Setting up Supabase

1. **Create a project** at [supabase.com/dashboard](https://supabase.com/dashboard): pick **region Mumbai (ap-south-1)**, which is closest to Bengaluru, and save the database password.
2. **Apply the schema.** From this folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>   # ref is in the project URL
   npm run db:push                                      # migrations + catalogue seed
   ```
   Or, without the CLI: open **SQL Editor** and run each file in `supabase/migrations/` in name order, then `supabase/seed.sql`.
3. **Turn on phone sign-in:** **Authentication → Sign In / Providers → Phone** → enable. Phone sign-in needs an SMS provider configured. Until you have a real one, choose Twilio and enter placeholder values. Test numbers never send an SMS.
4. **Add test numbers** (same screen, *Test phone numbers and OTPs*). Enter them without `+`:
   ```
   919000000001=123456, 919000000002=123456, 919000000003=123456, 919000000004=123456, 919000000005=123456
   ```
   Suggested use: …01 and …02 customers, …03 and …04 vendors, …05 admin. Sign in as +91 90000 00001 with OTP 123456.
5. **URL configuration** (**Authentication → URL Configuration**): Site URL = your Vercel URL (later); add `http://localhost:3000` to Redirect URLs.
6. **Make yourself admin.** After signing in once with the admin number, run in SQL Editor:
   ```sql
   update public.users set role = 'admin' where phone = '919000000005';
   ```
7. **Copy keys** from **Project Settings → API Keys**: Project URL, *Publishable* key, *Secret* key.

Storage buckets (`catalogue`, `shop-photos`, `id-photos`) are created by the migrations.

## Setting up Vercel

1. Push this folder to a GitHub repo, then **Add New → Project** in Vercel and import it. The framework preset is Next.js; no build settings need changing.
2. **Settings → Environment Variables:** add the variables below for Production and Preview.
3. **Settings → Functions → Function Region:** **Mumbai (bom1)**, the same region as the database.
4. Deploy, then put the deployment URL into Supabase *Site URL* (step 5 above) and `NEXT_PUBLIC_SITE_URL`.

### Demo login (no SMS needed)

Until an SMS provider is set up, the login screen fills in a demo number (90000 00001 for customers, 90000 00002 for vendors; type 90000 00005 for admin). Tapping **Send code** fills the code and signs in without any SMS. The server creates these accounts with `SUPABASE_SECRET_KEY` (it uses Supabase's Email sign-in, which is on by default). Any other number goes through real SMS. **Set `DEMO_LOGIN=off` in Vercel before real customers use the app.**

### Check the setup

Open `https://<your app>/api/health` after deploying. It shows yes/no for each piece (Supabase variables, phone sign-in, database, site URL, push, cron, server region) with what to fix. It never shows keys.

The app runs in **Mumbai (`bom1`)**, set in `vercel.json`, next to a Mumbai Supabase project. If your Supabase project is in another region, change `regions` to the nearest Vercel region, or every tap waits on a round trip across the world.

### Scheduled jobs (`vercel.json`)

| Job | IST | What it does |
|---|---|---|
| `booking-reminder` | 15:30 daily | Customers who haven't ordered for tomorrow: "Order by 5 pm" |
| `payment-due` | 18:00 daily | Per-delivery customers with an unpaid bill older than a day |
| `accept-reminder` | 19:00 daily | Vendors with orders still to accept before 9 pm |
| `monthly-statement` | 09:00 on the 1st | Monthly-bill customers get their total |

Each job is idempotent (deduplicated per day/month) and also sends any pending web push. Vercel's Hobby plan runs each job once a day and may start it anywhere within the hour; that is fine for these reminders. Set `CRON_SECRET` or the routes refuse to run.

**Web push:** run `npx web-push generate-vapid-keys` once and set the three VAPID variables. On iPhone, alerts only work after "Add to Home Screen" (iOS 16.4+); the Profile screen says so.

## Environment variables

Copy `.env.example` to `.env.local` for development.

| Name | Where from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`; legacy anon key also works) |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). **Server only, bypasses RLS** |
| `NEXT_PUBLIC_SITE_URL` | Your app URL (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:` + your email |
| `CRON_SECRET` | any long random string (`openssl rand -hex 32`) |
| `DEMO_LOGIN` | `off` to remove the demo numbers (on by default) |

Without the VAPID variables the app works and simply doesn't send push alerts.

## Key decisions

- **The booking window is enforced in Postgres** (`public.booking_state()`, computed in `Asia/Kolkata`). Customers and vendors have no direct write access to orders or payments; `SECURITY DEFINER` functions (`place_order`, `vendor_accept_orders`, `vendor_pack_order`, `claim_payment`, …) check the window and roles. `src/lib/time.ts` mirrors the same rules for the UI. Keep them in sync.
- **RLS on every table, plus column grants.** For example, a customer can edit their flat number but not `paused`, and a vendor can edit their shop but not `approval_status`. See `supabase/migrations/*_rls.sql`; `scripts/db-test/10_rls_test.sql` proves it.
- **Prices are ranges per unit.** `g` items are priced per 100 g. Order items snapshot the range; the vendor's final price must fall inside it (a CHECK constraint), and `line_total` is a generated column.
- **URLs have no locale prefix.** The language lives in the `NEXT_LOCALE` cookie (and `users.language`). Switching language reloads the page so no screen is left in the old language.
- **Cache Components is off.** Almost every screen is per-user.
- **Theme “Leaf & Lime”:** forest-green headers, lime main action, pastel cards, Outfit + Noto Sans Kannada, 15px body text, 48–56px pill buttons, one main action at the bottom, status = colour + shape + word, confirm sheets with the safe option nearest the thumb, 5-second undo, read aloud on orders and bills.

## Photos

Each item shows `public/veg/<slug>.webp` if it exists, otherwise a grey placeholder.

```bash
npm run photo -- tomato ~/Downloads/tomato.jpg "Shot at KR Market by Ravi"   # crop + resize + record credit
npm run catalogue                                                               # point seed.sql at the photo
```

Where each photo came from is recorded in `public/veg/credits.json`. Only use photos you have the right to use.

## Android test checklist

On a real Android phone (Chrome), against the deployed URL:

1. Open the WhatsApp join link from a WhatsApp message: the preview shows the shop and apartment; tapping opens the app.
2. Chrome offers **Install app**; the installed icon is the green basket; it opens full screen.
3. Sign in with a test number; switch to ಕನ್ನಡ and back on several screens.
4. Speak a list ("tomato one kg, kothambari two kattu") with the mic button; check the review screen.
5. Place, change and cancel an order before 5 pm; try after 5 pm and see it locked.
6. Turn on alerts in Profile; have the vendor accept → a notification arrives with the app closed; tapping it opens My order.
7. On the bill, **Pay with UPI** opens GPay/PhonePe with the amount filled in.
8. Turn on airplane mode and navigate: the offline page appears; pictures already seen still show.
9. Read aloud works in English and Kannada (Kannada needs the Google TTS Kannada voice installed).

## Before launch (tracked)

- Real photos for all 47 items (2 done: tomato, coriander); confirm the source/licence of every photo.
- Have a native Kannada speaker review `messages/kn.json` and the catalogue names.
- Configure a real SMS provider (MSG91 or Twilio with DLT registration for India) in Supabase Auth.
