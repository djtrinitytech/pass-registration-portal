## Event Pass Management System

Registration, desk approval, QR email pass issuance, gate scanning, and on-demand CSV export in one Next.js App Router project.

### Setup

1. Run `supabase-schema.sql` in the Supabase SQL editor.
2. Copy `.env.local.example` to `.env.local` and fill in Supabase, admin, and Gmail App Password values.
3. Run `npm install`, then `npm run dev`.

The public registration screen is `/`, the desk portal is `/admin`, and the mobile gate scanner is `/gate`. The service-role key is server-only and must never be exposed to browser code.

### Operations

- Desk approval uses a conditional update so two desks cannot issue the same registration twice.
- Approval email embeds a QR image containing the attendee UUID. Gate entry validates that UUID and atomically marks it as used.
- The desk export creates a UTF-8 CSV on demand with registration and status columns.

### Build

This project targets Next.js 15.5.7 and uses `next build --webpack` for environments where native Turbopack bindings are unavailable.

### Deploy to Vercel

Import the GitHub repository into Vercel and keep the detected framework as **Next.js**. Vercel will use the `build` script automatically.

Add these Production environment variables in **Project Settings → Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SECRET`
- `GATE_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `MAIL_FROM`

Run the SQL in `supabase-schema.sql` before testing the deployed API routes. Use the deployed `/gate` URL over HTTPS on the gate phone so browser camera permissions work. Never commit `.env`, `.env.local`, or the Supabase service-role key.

### Garba Night registration update

The public page uses the event poster details: DJSCE Trinity Garba Night, Friday 9 October 2026, Mukesh Patel Hall (Underground), entry fee ₹149. No start time was supplied.

Before deploying this version, run the final two ALTER TABLE statements in `supabase-schema.sql` in the Supabase SQL editor (or run the whole idempotent file). These add department and year to existing registrations. New submissions require one of the eight listed departments and a year from 1 to 4; both fields appear in desk verification and CSV exports. Existing attendees remain valid.

The public design uses optimized WebP artwork, a subtle repeating motif background, system fonts, native selects and expandable FAQs. It has mobile layouts and respects reduced-motion preferences.

For existing databases, apply supabase/migrations/20261008_registration_department_year.sql in Supabase SQL Editor before deploying. It adds the missing columns and reloads the REST schema cache. Missing columns otherwise prevent new registrations.

### Protected staff access

Apply `supabase/migrations/20261008_staff_auth.sql` in Supabase SQL Editor before deploying staff authentication. The migration stores only hashed session tokens and hashed login-rate buckets; it locks both tables and the throttling function to server access.

In Vercel environment settings, set `ADMIN_SECRET` to a unique desk password of at least 12 characters and `GATE_SECRET` to a different gate password of at least 12 characters. Use long random passwords. These values must never have a `NEXT_PUBLIC_` prefix. Update the same values in your ignored local `.env` for local staff access. Do not paste passwords into chat or commit them. Redeploy after environment changes. Optional `STAFF_AUTH_ORIGIN` must exactly match the website origin (without a trailing slash).

`/admin` and `/gate` redirect to a role-specific staff sign-in. Every desk and gate API checks the corresponding server session. Login allows eight attempts per trusted client IP in a 15-minute window (an unknown address shares one conservative bucket). Cookies are HttpOnly, Secure in production, SameSite Strict, and expire after two hours. Password changes invalidate sessions for that role; sign-out deletes server sessions. Staff routes cannot be framed and are not cached. Expired session rows may be periodically removed with `delete from public.staff_sessions where expires_at < now();` in the SQL editor.
