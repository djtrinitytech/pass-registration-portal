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
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `MAIL_FROM`

Run the SQL in `supabase-schema.sql` before testing the deployed API routes. Use the deployed `/gate` URL over HTTPS on the gate phone so browser camera permissions work. Never commit `.env`, `.env.local`, or the Supabase service-role key.

### Garba Night registration update

The public page uses the event poster details: DJSCE Trinity Garba Night, Friday 9 October 2026, Mukesh Patel Hall (Underground), entry fee ₹149. No start time was supplied.

Before deploying this version, run the final two ALTER TABLE statements in `supabase-schema.sql` in the Supabase SQL editor (or run the whole idempotent file). These add department and year to existing registrations. New submissions require one of the eight listed departments and a year from 1 to 4; both fields appear in desk verification and CSV exports. Existing attendees remain valid.

The public design uses optimized WebP artwork, a subtle repeating motif background, system fonts, native selects and expandable FAQs. It has mobile layouts and respects reduced-motion preferences.

For existing databases, apply supabase/migrations/20261008_registration_department_year.sql in Supabase SQL Editor before deploying. It adds the missing columns and reloads the REST schema cache. Missing columns otherwise prevent new registrations.
