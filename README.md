## Event Pass Management System

Registration, desk approval, QR email pass issuance, gate scanning, and on-demand CSV export in one Next.js App Router project.

### Setup

1. Run `supabase-schema.sql` in the Supabase SQL editor.
2. Copy `.env.local.example` to `.env.local` and fill in Supabase, admin, and Gmail App Password values.
3. Run `npm install`, then `npm run dev`.

The public registration screen is `/`, the desk portal is `/admin`, and the mobile gate scanner is `/gate`. The service-role key is server-only and must never be exposed to browser code.

### Operations

- Desk approval claims an email attempt atomically, so concurrent desk requests cannot send the same pass twice. SMTP acceptance is tracked separately from approval.
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
- `SUPER_ADMIN_SECRET`
- `MAIL_SETTINGS_KEY`
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

In Vercel environment settings, set `ADMIN_SECRET` to a unique desk password of at least 4 characters and `GATE_SECRET` to a different gate password of at least 4 characters. Use long random passwords. These values must never have a `NEXT_PUBLIC_` prefix. Update the same values in your ignored local `.env` for local staff access. Do not paste passwords into chat or commit them. Redeploy after environment changes. Optional `STAFF_AUTH_ORIGIN` must exactly match the website origin (without a trailing slash).

`/admin` and `/gate` redirect to a role-specific staff sign-in. Every desk and gate API checks the corresponding server session. Login allows eight attempts per trusted client IP in a 15-minute window (an unknown address shares one conservative bucket). Cookies are HttpOnly, Secure in production, SameSite Strict, and expire after two hours. Password changes invalidate sessions for that role; sign-out deletes server sessions. Staff routes cannot be framed and are not cached. Expired session rows may be periodically removed with `delete from public.staff_sessions where expires_at < now();` in the SQL editor.

### Reliable email delivery and owner sender controls

Apply `supabase/migrations/20261008_email_delivery.sql` after the staff-auth migration and before deploying this release. Existing approved registrations are marked `unknown` because their historical email delivery cannot be verified. Review them before retrying.

In Vercel → Project Settings → Environment Variables, add:

- `SUPER_ADMIN_SECRET`: a long random owner password, different from both desk and gate passwords (at least 4 characters). Share it only with the owner.
- `MAIL_SETTINGS_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Generate privately with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep this key stable and backed up securely. Changing or losing it makes saved sender credentials unreadable.

Neither variable may use a `NEXT_PUBLIC_` prefix. Set them for Production, then redeploy. Keep existing Supabase, `ADMIN_SECRET`, `GATE_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `MAIL_FROM` values. The Gmail environment settings are the initial sender until an owner saves a verified sender in the portal. `MAIL_FROM` should match that initial Gmail account.

Open `/super-admin` (or Owner email controls in the desk portal), sign in with the owner password, and enter the next Gmail address and its 16-character **app password**, not its normal Google password. Enable 2-Step Verification on that account first. The server verifies Gmail sign-in without sending a test email, then encrypts credentials with AES-256-GCM before saving them in a server-only, RLS-protected table. Passwords are never returned to the browser or written into HTML. Saved sender changes apply immediately; no Vercel redeployment is needed. An in-progress send keeps the sender it started with. Switching back preserves that sender's earlier usage; Gmail aliases share one counter.

The portal shows the current sender's rolling 24-hour usage and stops new sends at 300 accepted, uncertain, or in-progress attempts per account. This is an application safety budget, not a guarantee of Gmail capacity. Mail sent outside this website also counts towards Google's limit. Google's personal Gmail guidance describes a 500-email daily limit: https://support.google.com/mail/answer/22839 . Use only accounts you control and stay within each account's allowance; Google may still reject or defer emails.

Failed, explicitly rejected emails can be retried by desk staff or the owner. Uncertain outcomes (such as a timeout after sending) require owner review of the Sent folder and recipient before retrying. Active attempts cannot be retried for five minutes. Pause/resume controls are owner-only. Each retry is recorded, and a provider-accepted email cannot be sent again through the normal desk action. Accepted means SMTP acceptance, not verified inbox delivery. Recent attempts and up to 100 pending issues appear in the dashboard.

Optional transactional SMTP configuration: set `SMTP_HOST`, `SMTP_PORT` (465 or 587), `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` to the provider's verified sender. Saved portal Gmail credentials take precedence; remove the singleton row in `mail_sender_settings` through the Supabase SQL Editor to return to the environment sender. Do not change `MAIL_SETTINGS_KEY` as a way to clear sender settings.

Checks: `node tests/staff-auth.test.cjs`, `node tests/pass-email.test.cjs`, `node tests/mail-settings.test.cjs`, `npm run lint`, `npm run build`. Test SMTP is mocked; no attendee emails are sent by these tests.
