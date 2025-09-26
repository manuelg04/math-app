# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack on http://localhost:3000
- `npm run build` - Build production bundle with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npx prisma migrate dev` - Create and apply database migrations
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio GUI for database management
- `npx prisma db push` - Push schema changes without migrations (development only)

## Architecture

### MVVM Pattern Implementation

The codebase follows Model-View-ViewModel (MVVM) architecture:

1. **Models** (`/src/server/services/`): Business logic and data access
   - `auth-service.ts`: Authentication operations (register, login, password reset)
   - Direct Prisma database access
   - Returns typed results with success/error states

2. **View Models** (`/src/view-models/`): Presentation logic and state management
   - Custom hooks (e.g., `useLoginViewModel`, `useDashboardViewModel`)
   - Handle form state, validation, API calls
   - Provide clean interface between views and business logic
   - Always client-side components (`"use client"`)

3. **Views** (`/src/app/`, `/src/components/`): UI components
   - Server components for data fetching (`/app/dashboard/page.tsx`)
   - Client components for interactivity (`/app/dashboard/dashboard-client.tsx`)
   - No direct business logic, only rendering

### Key Architectural Decisions

**Authentication Flow**:
- JWT tokens stored in httpOnly cookies (`math_app_token`)
- Token utilities in `/src/lib/token.ts` use Web Crypto API (Edge Runtime compatible)
- Middleware (`/src/middleware.ts`) protects `/dashboard/*` routes
- Cookie functions use async `await cookies()` (Next.js 15 requirement)

**API Routes** (`/src/app/api/`):
- Thin layer that validates input
- Delegates to service layer
- Returns consistent JSON responses: `{ success: boolean, message?: string, ... }`

**Database**:
- PostgreSQL with Prisma ORM
- User model with roles (STUDENT/TEACHER)
- OTP codes stored for password reset

**Error Handling**:
- Typed errors in `/src/lib/errors.ts` with `AuthErrorCode` enum
- Services return discriminated unions for type-safe error handling

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` or `JWT_SECREAT` (legacy typo support) - Secret for JWT signing
- `EMAIL_FROM` - Sender email for password reset
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` - SMTP configuration

## Tech Stack

- **Framework**: Next.js 15.5 with App Router and Turbopack
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Authentication**: Custom JWT implementation with httpOnly cookies
- **Runtime**: Node.js for API routes, Edge Runtime for middleware