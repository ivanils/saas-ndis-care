# Bellvi — NDIS Care Management Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-bellvi.ivanllanos.com-FF6B6B?style=for-the-badge&logo=vercel&logoColor=white)](https://bellvi.ivanllanos.com/)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

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

```sql
-- Workers only see shifts for their own agency
CREATE POLICY "agency_isolation" ON shifts
  FOR ALL USING (agency_id = (
    SELECT agency_id FROM profiles WHERE id = auth.uid()
  ));
```

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
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Styling | CSS Modules (SCSS), custom design system |
| Backend | FastAPI (Python 3.x), Uvicorn, Pydantic v2 |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth — JWT + SSR cookies (`@supabase/ssr`) |
| Maps | Leaflet + react-leaflet |
| File storage | Supabase Storage |
| Deployment | Vercel (frontend) |

---

## Security

- **JWT authentication** validated on every backend request via FastAPI dependency injection
- **Row-Level Security** on all tables — multi-tenancy enforced at the database layer
- **RBAC at three levels**: middleware (route protection), API route, and database policy
- **Workers restricted** to safe shift status transitions only (`in_progress`, `completed`, `pending_approval`)
- **GPS coordinate validation** — lat/lng bounds enforced in Pydantic (`ge=-90, le=90`)
- **Soft deletes** on all clinical data — immutable audit trail for NDIS compliance
- **Service Role Key** used server-side only — never sent to the browser
- **CORS** restricted to known origins; `Content-Type` and `Authorization` headers only

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
│       │   ├── admin/         # Admin portal — dashboard, rostering, staff, compliance
│       │   ├── superadmin/    # Super admin portal
│       │   ├── api/           # Next.js API routes (user management)
│       │   ├── login/         # Auth page
│       │   └── page.tsx       # Landing page
│       ├── components/        # Shared components (sidebars, map, modals)
│       ├── lib/               # Supabase client
│       └── middleware.ts      # Route protection + RBAC redirects
└── backend/                   # FastAPI application
    ├── main.py
    ├── schemas.py
    ├── dependencies.py        # JWT validation + CurrentUser injection
    └── routers/               # shifts, care_notes, participants, profiles, auth
```

---

## Author

Built by [Ivan Llanos](https://ivanllanos.com) — Full Stack Developer.

For questions, demos, or partnership enquiries: [ivan.llanos.santamaria@gmail.com](mailto:ivan.llanos.santamaria@gmail.com)
