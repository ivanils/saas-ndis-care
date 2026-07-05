# Bellvi — NDIS Care Management Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-bellvi.ivanllanos.com-FF6B6B?style=for-the-badge&logo=vercel&logoColor=white)](https://bellvi.ivanllanos.com/)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![CI](https://github.com/ivanils/saas-ndis-care/actions/workflows/ci.yml/badge.svg)

> End-to-end care operations platform built for NDIS providers — from shift rostering and GPS-verified clock-ins to clinical documentation and compliance reporting.

---

## Live Demo

**URL:** [https://bellvi.ivanllanos.com](https://bellvi.ivanllanos.com/)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bellvi.com | DemoBellvi2026! |
| Worker | worker@bellvi.com | DemoBellvi2026! |

> The Admin account gives access to the full rostering, staff, and compliance dashboards. The Worker account shows the shift calendar, participant profiles, and GPS clock-in flow.

---

## What is Bellvi?

Australia's NDIS sector supports over 600,000 participants, yet most disability support agencies still rely on paper timesheets, scattered messages, and spreadsheet rosters. Errors in documentation aren't just inefficient — they carry real compliance risk under NDIS Quality and Safeguarding requirements.

Bellvi is a multi-tenant SaaS platform that consolidates everything into one system: workers clock in and out with GPS verification, care notes are logged against shifts in real time, and admins get a live overview of their entire field operation. Every record is timestamped, tamper-evident, and auditable — built from the ground up for NDIS compliance.

---

## Features

### Worker Portal
- **Live shift dashboard** — real-time status display (Assigned → In Progress → Completed → Pending Approval)
- **GPS-verified clock-in / clock-out** — coordinates captured and stored per shift
- **Calendar + list view** of all assigned shifts with participant details accessible on any status
- **Participant profiles** — NDIS ID, medical alerts, emergency contacts
- **Care note creation** — rich text notes linked to shifts, with attachment and signature support
- **Profile management** — avatar upload via Supabase Storage

### Admin Portal
- **Live GPS map** — real-time field worker positions via Leaflet
- **Rostering engine** — create and assign shifts to workers with time validation
- **Staff management** — onboard workers, manage profiles and certifications
- **Participant management** — create, view, and edit participant profiles with full clinical data (NDIS ID, address, blood type, allergies, emergency contacts, mobility notes)
- **Compliance dashboard** — shift audit trail, incident logs, approval workflow
- **Real-time shift status overview** — approve, dispute, or escalate submissions

### Super Admin Portal
- **Global platform metrics** across all agencies
- **Tenant management** — create and configure agencies
- **Cross-agency user management**
- **Platform-level audit logs**

---

## Architecture

```
Browser (Next.js / Vercel)
    │
    ├── /api/* (Next.js API Routes — service-role operations)
    │
    └── FastAPI (Python / Uvicorn)
            │
            └── Supabase
                    ├── PostgreSQL  (data + RLS policies)
                    ├── Auth        (JWT + session management)
                    └── Storage     (avatars, medical documents)
```

### Multi-Tenancy

Every core table carries an `agency_id` foreign key. PostgreSQL Row-Level Security (RLS) policies enforce agency boundaries at the database layer — even if application logic has a bug, cross-tenant data access is structurally impossible.


All clinical records use **soft deletes** (`deleted_at` timestamp) instead of hard `DELETE` — preserving a complete audit trail as required by NDIS regulations.

### Role-Based Access Control

| Capability | Worker | Admin | Super Admin |
|---|:---:|:---:|:---:|
| View own shifts | ✓ | ✓ | ✓ |
| View all agency shifts | — | ✓ | ✓ |
| Clock in / out (GPS) | ✓ | ✓ | ✓ |
| Approve / dispute shifts | — | ✓ | ✓ |
| Create & assign shifts | — | ✓ | ✓ |
| View participant profiles | ✓ | ✓ | ✓ |
| Manage participants (CRUD) | — | ✓ | ✓ |
| Create care notes | ✓ | ✓ | ✓ |
| Staff management | — | ✓ | ✓ |
| Compliance dashboard | — | ✓ | ✓ |
| Live GPS map | — | ✓ | ✓ |
| Manage agencies | — | — | ✓ |
| Platform audit logs | — | — | ✓ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.4 (App Router), React 19, TypeScript |
| Styling | CSS Modules (SCSS), custom design system |
| Backend | FastAPI (Python 3.x), Uvicorn, Pydantic v2 |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth — JWT + SSR cookies (`@supabase/ssr`) |
| Maps | Leaflet + react-leaflet |
| File storage | Supabase Storage |
| CI | GitHub Actions (ESLint, tsc, ruff) |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

---

## Security

A dedicated security audit was conducted before production launch. 16 findings were identified and resolved across privilege escalation, tenant isolation, input validation, and data integrity.

Selected findings and fixes:

| Finding | Impact | Fix |
|---|---|---|
| `ProfileUpdate.role` accepted any string | Privilege escalation to super_admin | Pydantic enum + server-side role-change guard |
| Registration not atomic | Orphaned DB records on auth failure | Auth-first order + compensating transactions |
| Browser-side mutations without agency check | Cross-tenant writes possible | Moved to Next.js API routes with server-side validation |
| `worker_certifications` / `worker_participants` had no RLS | Cross-tenant reads | Agency-scoped RLS policies via Supabase migration |
| Workers could POST arbitrary shift status | Bypass approval flow | Server-side override forces `status = "assigned"` |
| Email fields accepted any string | Malformed data, no feedback | Changed to `EmailStr` (Pydantic v2), returns 422 |

Additional hardening:

- **JWT authentication** validated on every backend request via FastAPI dependency injection
- **RBAC at three levels**: middleware (route protection), API route, and database policy
- **GPS coordinate validation** — lat/lng bounds enforced in Pydantic (`ge=-90, le=90`)
- **Soft deletes** on all clinical data — immutable audit trail for NDIS compliance
- **Service Role Key** used server-side only — never exposed to the browser
- **CORS** restricted to known production origins

---

## Engineering Process

**CI pipeline** — GitHub Actions runs on every push and PR: ESLint (frontend), TypeScript type-check (`tsc --noEmit`), and Ruff (Python linter). No PR merges without a green pipeline.

**Database migrations** — All schema changes go through the Supabase CLI (`supabase db push`) and are tracked in version control under `supabase/migrations/`. The SQL editor is never used for schema changes.

**Git workflow** — PR-only workflow. No direct commits to `main`. Every change is a descriptive branch → PR → CI pass → merge. Commit history reflects individual logical changes, not batched dumps.

---

## Local Setup

### Prerequisites
- Node.js 18+, npm
- Python 3.10+, pip
- A Supabase project with the schema applied

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # add your Supabase URL + keys
npm install
npm run dev                         # http://localhost:3000
```

### Backend

```bash
cd backend
cp .env.example .env               # add your Supabase URL + service key
pip install -r requirements.txt
uvicorn main:app --reload           # http://localhost:8000
```

### Environment Variables

**Frontend (`.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Backend (`.env`):**
```
SUPABASE_URL=
SUPABASE_KEY=
```

---

## Project Structure

```
saas-ndis-care/
├── frontend/                  # Next.js application
│   └── src/
│       ├── app/
│       │   ├── (worker)/      # Worker portal — dashboard, shifts, participants, settings
│       │   ├── admin/         # Admin portal — dashboard, rostering, staff, participants, compliance
│       │   ├── superadmin/    # Super admin portal
│       │   ├── api/           # Next.js API routes (user management, certifications, assignments)
│       │   ├── login/         # Auth page
│       │   └── page.tsx       # Landing page
│       ├── components/        # Shared components (sidebars, map, modals)
│       ├── lib/               # Supabase client
│       └── middleware.ts      # Route protection + RBAC redirects
├── backend/                   # FastAPI application
│   ├── main.py
│   ├── schemas.py
│   ├── dependencies.py        # JWT validation + CurrentUser injection
│   └── routers/               # shifts, care_notes, participants, profiles, auth
└── supabase/
    ├── config.toml
    └── migrations/            # Versioned SQL migrations (applied via supabase db push)
```

---

## Author

Built by [Ivan Llanos](https://ivanllanos.com) — Full Stack Developer.

For questions, demos, or partnership enquiries: [ivan.llanos.santamaria@gmail.com](mailto:ivan.llanos.santamaria@gmail.com)
