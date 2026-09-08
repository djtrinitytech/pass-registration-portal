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
