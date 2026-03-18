# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 App Router storefront. Use `app/` for pages, layouts, and API route handlers; notable areas include `app/admin`, `app/auth`, `app/account`, and `app/api`. Keep shared UI in `components/`, business and integration logic in `lib/`, client state in `store/`, and shared typings in `types/`. Database assets live in `prisma/` (`schema.prisma`, `migrations/`, `seed.ts`). Static files belong in `public/`, and planning notes live in `docs/`.

## Build, Test, and Development Commands
Run `npm run dev` to start the local app on port 3000. Start Postgres with `docker compose up -d db` before working on database-backed flows. Use `npx prisma migrate dev` to apply schema changes locally, `npx prisma db seed` to load sample catalog data, and `npm run prisma:generate` to refresh the Prisma client. Run `npm run lint -- .` before opening a PR. Use `npm run build` to catch production-only issues. For Stripe webhook testing, run `npm run stripe:listen`.

## Coding Style & Naming Conventions
The codebase uses TypeScript, React 19, and Prisma. Follow the existing style: 2-space indentation, semicolon-free statements, and double-quoted imports/strings. Prefer the `@/` path alias over deep relative imports. Name React components in `PascalCase` (`ProductsManager.tsx`), hooks/helpers in `camelCase`, and route folders in lowercase kebab-style where appropriate. Keep server-side integration code in `lib/` instead of embedding it directly in route handlers or page components. Linting is defined in `eslint.config.mjs`; there is no Prettier config in this repo.

## Testing Guidelines
There is no committed automated test suite yet. Until one is added, every change should pass `npm run lint -- .` and `npm run build`, plus manual checks for the affected flows. For auth, checkout, shipping, or admin changes, include explicit manual verification steps in the PR. If you introduce tests, place them under `tests/` or beside the module as `*.test.ts(x)`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style (`feat:`, `fix:`, `chore:`, `docs:`). Keep subjects imperative and specific. PRs should include a short summary, linked issue or task when available, notes on schema or environment-variable changes, and screenshots for storefront or admin UI updates. Never commit `.env`; document required keys such as `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and Stripe credentials in the PR when they change.
