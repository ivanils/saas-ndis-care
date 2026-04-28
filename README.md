# NDIS Care Management SaaS (MVP)

A B2B Multi-tenant SaaS platform tailored for Australian Disability Support and Home Care agencies, ensuring strict compliance with NDIS (National Disability Insurance Scheme) data isolation and audit requirements.

## 🏗️ System Architecture

This project is structured as a Monorepo containing both the frontend and backend applications, relying on a robust infrastructure:

* **Frontend:** React (Next.js with App Router)
* **Backend:** Python (FastAPI + Pydantic)
* **Database & Auth:** PostgreSQL + Supabase (Local & Cloud)

## 🔐 Core Technical Decisions

* **Hardware-Level Multi-Tenancy:** Data isolation is enforced at the database engine level using PostgreSQL Row Level Security (RLS) policies based on custom JWT claims (`agency_id`).
* **Audit Trail Compliance:** Hard deletions (`DELETE`) are strictly prohibited for transactional records. The system utilizes a `deleted_at` column (Soft Deletes) to maintain an immutable history of shifts and care notes.
* **Timezone Strategy:** All database timestamps are stored strictly in UTC (`timestamptz`). Localization (AEST/Brisbane time) is handled exclusively at the presentation layer.

