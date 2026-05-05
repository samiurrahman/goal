# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HajjScanner is a Hajj & Umrah travel booking platform built with Next.js 13 (App Router). It connects pilgrims with verified travel agents, allowing users to browse agent profiles, compare packages, read/write reviews, and proceed to checkout. The site is live at hajjscanner.com.

## Commands

```bash
pnpm dev          # Start dev server (Next.js)
pnpm build        # Production build
pnpm lint         # ESLint (next lint)
pnpm format       # Prettier write
pnpm format:check # Prettier check
```

Package manager is **pnpm** (lockfile: `pnpm-lock.yaml`). No test framework is configured.

## Architecture

### Tech Stack
- **Next.js 13.x** with App Router (`src/app/`), TypeScript, TailwindCSS 3, SCSS
- **Supabase** for auth (email/password + Google OAuth), database, and storage
- **React Query** (`@tanstack/react-query`) for client-side data fetching/caching
- **HeadlessUI** + **Heroicons** for UI primitives
- Dark mode via `class` strategy on `<html>` element

### Routing & Key Pages
- `/` - Homepage with hero search
- `/packages` - Package listing with filters (agent, location, price, duration, month, hotel distance)
- `/[agentName]` - Agent profile page (server component, fetches from Supabase `agents` table by slug)
- `/[agentName]/[slug]` - Package detail page with itinerary, amenities, policies, purchase summary
- `/login`, `/signup` - Auth pages. Signup accepts `?userType=user|agent` query param
- `/checkout` - Booking checkout flow
- `/account`, `/listed-packages`, `/my-bookings`, `/bookings`, `/account-settings` - Protected account pages

### Authentication Flow
- Supabase Auth with cookie-based session (`access_token` cookie via `js-cookie`)
- `src/middleware.ts` protects account routes; redirects to `/login?redirect=...` if no `access_token` cookie
- `SupabaseSessionSync` (client component in root layout) syncs Supabase session on mount, creates `user_details` and `agents` rows for new OAuth users based on `?userType=` param
- Two user types: `user` (can review agents) and `agent` (can manage packages)

### Supabase Setup
- Client singleton in `src/utils/supabaseClient.ts` (lazy proxy pattern)
- Env config centralized in `src/lib/supabase-env.ts` with fallbacks for multiple env var naming conventions
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional: `SUPABASE_SERVICE_ROLE_KEY` (used in API routes for admin operations bypassing RLS)

### Database Tables (Supabase)
- `agents` - Agent profiles (slug, contact info, rating cache, social links, founders JSON)
- `packages` - Hajj/Umrah package listings linked to agents
- `package_details` - Extended package info (itinerary, stay info, amenities, policies, purchase summary)
- `agent_reviews` - User reviews of agents (triggers auto-update `rating_avg`/`rating_total` on `agents`)
- `user_details` - User profiles linked to `auth.users` via `auth_user_id`
- SQL migrations live in `database/migrations/`

### API Routes
- `POST /api/agents/reviews` - Submit agent review (auth required, agents cannot review)
- `GET /api/agents/reviews?agentId=` - Fetch reviews for an agent

### Component Organization
- `src/app/(client-components)/` - Client-side header, search forms (desktop + mobile variants)
- `src/app/(server-components)/` - Server-rendered sections
- `src/app/(account-pages)/` - Protected account section with shared layout and nav
- `src/app/[agentName]/(components)/` - Agent/package detail sub-components
- `src/components/` - Shared components (cards, gallery, footer, ratings, image upload)
- `src/shared/` - Base UI primitives (Button variants, Input, Avatar, Logo, Modal, Navigation)

### Styling
- TailwindCSS with custom color system via CSS variables defined in `src/styles/__theme_colors.scss`
- Custom theme colors: `primary`, `secondary`, `neutral` (mapped from CSS vars)
- Font: Poppins (loaded via `next/font/google`)
- Icon set: Line Awesome 1.3.0 (`src/fonts/line-awesome-1.3.0/`)
- Additional SCSS in `src/styles/` for theme customization, fonts, date picker, header

### Code Conventions
- Prettier: single quotes, 100 char width, trailing commas (es5), 2-space indent
- Path alias: `@/` maps to `src/`
- Data types defined in `src/data/types.ts` (Agent, Package, PackageDetails, AgentReview, etc.)
- Server components fetch directly from Supabase; client components use React Query
- The codebase has backward-compatibility fallbacks for missing DB columns (graceful degradation when schema migrations haven't been applied)
