# Vraizen Tech CRM/ERP

Production-ready internal CRM/ERP for Vraizen Tech — built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **UI Components**: Custom components built on Radix UI primitives
- **Charts**: Recharts
- **Data Fetching**: TanStack React Query + Supabase JS Client
- **Auth**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Multi-tenancy**: tenant_id on all business tables

## Features

- **Authentication** — Email/password login with role-based access (Admin/Employee)
- **Admin Dashboard** — Stats, charts (revenue, clients, tasks, leads), upcoming billing, activity
- **Employee Dashboard** — My tasks, check-in/out, assigned projects
- **Client Management** — Full CRUD with 360° detail page, services, billing, payments
- **Project Management** — Projects with assigned team members, tasks, timeline
- **Task Management** — Tasks with comments, priority, status tracking, overdue indicators
- **Leads Pipeline** — Kanban board with drag-and-drop, lead-to-client conversion
- **Recurring Billing** — Subscriptions, billing cycles, MRR/ARR tracking, payment recording
- **Proposals** — Line-item proposal builder with PDF generation and AI generation
- **Client Requests** — Internal request system with convert-to-task workflow
- **Attendance** — Employee check-in/check-out with monthly reports
- **Notifications** — In-app notification center
- **Activity Logging** — Timeline of all system events
- **Reports** — Revenue, clients, tasks, attendance, leads, projects
- **Global Search** — Ctrl+K command palette across all entities
- **Settings** — Company config, services management

## Setup

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Database Migrations

Execute the SQL files in order in the Supabase SQL Editor:

1. `supabase/migrations/001_schema.sql` — Tables, enums, indexes, triggers
2. `supabase/migrations/002_rls.sql` — Row Level Security policies
3. `supabase/migrations/003_functions.sql` — Helper functions and triggers
4. `supabase/migrations/004_seed.sql` — Default services

### 3. Create Admin Account

In the Supabase SQL Editor after running migrations:

```sql
-- 1. Create the tenant
INSERT INTO tenants (id, name, address, phone, email, website)
VALUES (
  gen_random_uuid(),
  'Vraizen Tech',
  'Pipliyahna, World Cup Square, Indore, Madhya Pradesh',
  '+91 62656 60387',
  'contact@vraizentech.com',
  'https://vraizentech.com'
);

-- 2. Note the tenant ID
SELECT id FROM tenants WHERE name = 'Vraizen Tech';

-- 3. Create a user via Supabase Auth Dashboard (Authentication > Users > Add User)
--    Email: your-admin@email.com, Password: your-password

-- 4. Insert the profile (replace TENANT_ID and USER_ID)
INSERT INTO profiles (id, tenant_id, email, full_name, role)
VALUES ('USER_ID', 'TENANT_ID', 'your-admin@email.com', 'Your Name', 'admin');

-- 5. Seed default services for your tenant (replace TENANT_ID)
INSERT INTO services (tenant_id, name) VALUES
  ('TENANT_ID', 'Website'),
  ('TENANT_ID', 'E-commerce'),
  ('TENANT_ID', 'Website Maintenance'),
  ('TENANT_ID', 'SEO'),
  ('TENANT_ID', 'Meta Ads'),
  ('TENANT_ID', 'Google Ads'),
  ('TENANT_ID', 'AI Chatbot'),
  ('TENANT_ID', 'AI Automation'),
  ('TENANT_ID', 'Other');
```

### 4. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AI_API_KEY=your-openai-key          # Optional, for AI proposals
AI_PROVIDER=openai                   # Optional
```

Find these in Supabase Dashboard > Settings > API.

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          — Login page
│   ├── (dashboard)/           — All dashboard pages
│   │   ├── page.tsx           — Dashboard (admin/employee)
│   │   ├── clients/           — Client list + [id] 360° page
│   │   ├── projects/          — Project list + [id] detail
│   │   ├── tasks/             — Task list + [id] detail
│   │   ├── leads/             — Lead kanban + [id] detail
│   │   ├── billing/           — Subscriptions + payments
│   │   ├── proposals/         — Proposal list + builder
│   │   ├── employees/         — Employee list + [id] detail
│   │   ├── attendance/        — Check-in/out + reports
│   │   ├── reports/           — Analytics reports
│   │   ├── notifications/     — Notification center
│   │   └── settings/          — Company settings
│   └── api/                   — API routes (employee creation, AI)
├── components/
│   ├── ui/                    — Base UI components (button, card, dialog, etc.)
│   ├── shared/                — DataTable, StatusBadge, KanbanBoard, etc.
│   ├── layout/                — Sidebar, Topbar, MobileNav
│   └── modules/               — Module-specific components
├── lib/
│   ├── supabase/              — Supabase client (browser, server, admin)
│   ├── auth/                  — AuthProvider, RequireAuth, RequireAdmin
│   ├── queries/               — React Query hooks per module
│   ├── types/                 — TypeScript database types
│   └── utils.ts               — Utilities (formatting, helpers)
└── middleware.ts              — Auth redirect middleware

supabase/
└── migrations/                — SQL schema, RLS, functions, seed
```

## Security

- All data access enforced via Supabase Row Level Security
- Multi-tenant isolation via tenant_id on every table
- Admin/employee role checks at database level
- Service role key used server-side only
- Frontend role checks are UI-only (defense in depth)

## Future-Ready

Architecture supports adding:
- Razorpay/Stripe payment gateway
- Client portal
- Email/WhatsApp notifications
- AI-powered reports
- Invoice generation
- Multi-tenant SaaS mode
