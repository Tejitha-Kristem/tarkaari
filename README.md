# Tarakari · ತರಕಾರಿ

Next-day vegetable ordering between apartment residents in Bengaluru and their local vendor. Mobile-first installable PWA in English and Kannada.

- Booking window 10:00–17:00 IST for delivery next morning; vendor accepts by 21:00.
- Payment goes straight from customer to vendor (UPI link or cash). The app never holds money.
- Roles: customer, vendor, admin.

## Build status

| Phase | Scope | Status |
|---|---|---|
| 1 | Setup, i18n, PWA, Supabase clients, schema + RLS, catalogue seed (+ aliases, invite codes) | ✅ done |
| 2 | Auth and onboarding (all roles), **WhatsApp join links** (`/j/<code>`, link preview) | next |
| 3 | Vendor setup, admin approval, **"Share to WhatsApp group" per apartment**, **type/speak a list to set stock & prices** | |
| 4 | Customer ordering, **type/paste/speak a list → cart** (review before adding) | |
| 5 | Vendor fulfilment: **item totals across all apartments → per apartment → house-by-house lists** | |
| 6 | Bills, payments, reminders (cron), pause | |
| 7 | Admin panel, read-aloud everywhere, polish, accessibility pass | |
| 8 | Deploy + Android test checklist | |

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
  db-test/                migration + RLS tests on plain Postgres
supabase/
  config.toml             local CLI config, test OTP numbers
  migrations/             schema → functions → RLS → storage
  seed.sql                generated catalogue (47 items)
src/
  app/[locale]/           all screens (locale comes from cookie, not URL)
  app/manifest.ts         web app manifest
  components/             app components + ui/ (shadcn/ui)
  hooks/                  use-undo, use-switch-locale
  i18n/                   next-intl routing, request config, navigation
  lib/time.ts             IST booking-window rules (+ tests)
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
| `npm run db:test` | Run migrations and 72 RLS/rule checks on a local Postgres (set `PGHOST`, `PGPORT`, `PGUSER`) |

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

Cron jobs arrive in phase 6. Vercel's Hobby plan runs cron at most once a day, and only *somewhere within the scheduled hour*, so a "4 pm" reminder could fire at 4:59. Phase 6 will either use the Pro plan or an alternative scheduler for that one job.

## Environment variables

Copy `.env.example` to `.env.local` for development.

| Name | Where from | Needed from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | phase 2 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`; legacy anon key also works) | phase 2 |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). **Server only, bypasses RLS** | phase 3 |
| `NEXT_PUBLIC_SITE_URL` | Your app URL (`http://localhost:3000` locally) | phase 2 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` | phase 6 |
| `VAPID_SUBJECT` | `mailto:` + your email | phase 6 |
| `CRON_SECRET` | any long random string (`openssl rand -hex 32`) | phase 6 |

The app runs without Supabase variables (phase 1 screens only) and fails with a clear message when a feature needs them.

## Key decisions

- **The booking window is enforced in Postgres** (`public.booking_state()`, computed in `Asia/Kolkata`). Customers and vendors have no direct write access to orders or payments; later phases add `SECURITY DEFINER` functions that check the window and roles. `src/lib/time.ts` mirrors the same rules for the UI. Keep them in sync.
- **RLS on every table, plus column grants.** For example, a customer can edit their flat number but not `paused`, and a vendor can edit their shop but not `approval_status`. See `supabase/migrations/*_rls.sql`; `scripts/db-test/10_rls_test.sql` proves it.
- **Prices are ranges per unit.** `g` items are priced per 100 g. Order items snapshot the range; the vendor's final price must fall inside it (a CHECK constraint), and `line_total` is a generated column.
- **URLs have no locale prefix.** The language lives in the `NEXT_LOCALE` cookie (and `users.language` from phase 2). Switching language reloads the page so no screen is left in the old language.
- **Cache Components is off.** Almost every screen is per-user.
- **Accessibility baseline in the theme:** `text-sm` = 18px, `text-base` = 20px, buttons ≥ 56px, status = colour + shape + word, confirm sheets with the safe option nearest the thumb, 5-second undo.

## Photos

Each item shows `public/veg/<slug>.webp` if it exists, otherwise a grey placeholder.

```bash
npm run photo -- tomato ~/Downloads/tomato.jpg "Shot at KR Market by Ravi"   # crop + resize + record credit
npm run catalogue                                                               # point seed.sql at the photo
```

Where each photo came from is recorded in `public/veg/credits.json`. Only use photos you have the right to use.

## Before launch (tracked)

- Real photos for all 47 items (2 done: tomato, coriander); confirm the source/licence of every photo.
- Have a native Kannada speaker review `messages/kn.json` and the catalogue names.
- Remove the `/kit` design page.
