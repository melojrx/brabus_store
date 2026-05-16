# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Production build
npm run lint         # ESLint (no args needed)
npm run start        # Start production server

# Database
docker compose up -d                    # Start PostgreSQL
npx prisma migrate deploy               # Apply migrations
npx prisma generate                     # Regenerate client after schema changes
npx prisma migrate dev --name <name>    # Create new migration

# Stripe (dev)
npm run stripe:listen                   # Forward Stripe webhooks to localhost

# Scripts
npm run integrations:check              # Validate external integrations
npm run orders:backfill-number          # Backfill order numbers
```

## Architecture

Next.js 16 App Router, TypeScript, React 19, Tailwind CSS, PostgreSQL via Prisma ORM.

### Auth
- NextAuth v5 (beta) with credentials provider only (`auth.ts` at root)
- Roles: `ADMIN`, `CUSTOMER`, `SELLER`
- SELLER has same access as ADMIN (staff-level)
- Session carries `id`, `role`, `phone`, `mustChangePassword` via JWT callbacks
- `proxy.ts` handles auth redirects and forced password change
- Admin routes additionally protected by `isStaffRole()` guard in layout/route handlers
- `lib/auth-guard.ts` — centralized `isStaffRole()` helper

### Data Layer
- Prisma schema at `prisma/schema.prisma`
- Singleton client at `lib/prisma.ts`
- Path alias: `@/*` maps to project root

### Key Domain Models
- `User` — auth identity (login/password/role), `mustChangePassword` for temp passwords
- `Customer` — commercial entity (CPF/CNPJ, address), 1:1 optional link to User
- `Order` — belongs to User (via `userId`), has `orderNumber` (public), `channel` (ONLINE/PDV/LEGACY), `sellerId` (who sold)
- `Product` → `ProductVariant` (stock lives on variant)
- `Seller` — independent cadastro, optional 1:1 link to User (for login)
- `Supplier` — independent cadastro mestre

### Route Structure
- `/app/` — public store (loja, products, cart, checkout, account)
- `/app/admin/` — admin panel (protected by layout auth check)
- `/app/api/admin/` — admin API routes (each checks `session.user.role === "ADMIN"`)
- `/app/api/v1/integrations/` — external API (Bearer token auth via `IntegrationApiKey`)
- `/app/api/auth/` — NextAuth handlers + register/forgot/reset

### State Management
- `store/cartStore.ts` — Zustand with localStorage persistence, isolated per user

### Styling Conventions
- Dark theme by default, CSS variables for brand colors
- Admin: `bg-zinc-900`, `border-white/5`, classes `.input-admin`, `.label-admin`
- Icons: Lucide React
- Fonts: Inter (body), Bebas Neue (headings via `font-heading`)

### Integration API Pattern
- Auth: `lib/integrations/auth.ts` — Bearer token, SHA-256 hash lookup, scope validation
- Response: `lib/integrations/response.ts` — `integrationSuccess()` / `integrationError()`
- Keys prefixed `brb_live_` / `brb_test_`

### Admin API Pattern
All admin routes follow:
```typescript
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}
```
Pagination returns `{ data: [...], meta: { page, pageSize, totalItems, totalPages } }`.

### Order Domain
- `paymentStatus` and `status` (operational) are independent
- Stock decrements on payment confirmation, restores on cancel/refund
- `orderNumber` format: `PREFIXO-YYMMDD-NNNN` (daily sequential per channel)
- PDV uses a walk-in customer (`pdv-balcao@brabus.local`) for anonymous sales

## Key Files

- `auth.ts` — NextAuth config
- `proxy.ts` — Auth redirects, forced password change, role-based access
- `lib/auth-guard.ts` — `isStaffRole()` helper
- `lib/prisma.ts` — DB client singleton
- `lib/pdv.ts` — PDV order creation logic + Zod schemas
- `lib/admin-dashboard.ts` — Dashboard aggregation queries
- `lib/public-checkout.ts` — Checkout order creation
- `lib/order-stock.ts` — Stock decrement/restore logic
- `lib/customers.ts` — CPF/CNPJ validation and formatting
- `components/AdminNavigation.tsx` — Admin sidebar nav config
- `store/cartStore.ts` — Cart state

## Conventions

- Language: Portuguese for UI text, English for code/variables/commits
- Commit messages: conventional commits in English
- Commits must be authored by: `Junior Melo <jrmeloafrf@gmail.com>`
- Soft delete: `active: false` (never hard delete business entities)
- API validation: Zod for complex inputs, manual checks for simple CRUD
- Feedback component: `AdminInlineFeedback` for admin CRUD operations
- Documents: `docs/PLAN.md` (strategy), `docs/TASKS.md` (operational tracking)
- Always follow best practices for security, performance, and accessibility
- Keep code clean, readable, and maintainable — no dead code, no unnecessary complexity
- Zero regressions: verify build passes and existing flows remain intact after every change
