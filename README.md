# 🏥 NDIS Care Management SaaS (MVP)

> ⚠️ **Project Status: Active Development (Work in Progress)** > *This repository is currently under active construction. The core architecture and backend foundations are being established. It is not yet ready for local execution or production deployment.*

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

## 📍 Current Progress (MVP Roadmap)

- [x] **Phase 1:** System architecture and business logic definition.
- [x] **Phase 2:** Database schema design, Multi-tenant RLS, and local Supabase Docker setup.
- [x] **Phase 3:** FastAPI backend initialization and JWT dependency injection.
- [ ] **Phase 4:** Core API endpoints (Auth, Shifts, Care Notes) *(Currently in progress)*.
- [ ] **Phase 5:** Next.js Frontend Development and API Integration.
