# 🏥 Bellvi | NDIS Care Management SaaS (MVP)

> ⚠️ **Project Status: Active Development** > *The Worker Portal MVP is successfully completed. Active development has now shifted to the Admin/Coordinator Portal and Middleware security implementation.*

A B2B Multi-tenant SaaS platform tailored for Australian Disability Support and Home Care agencies. Bellvi ensures strict compliance with NDIS (National Disability Insurance Scheme) data isolation, audit requirements, and seamless shift management.

## 🏗️ System Architecture

This project is structured as a modern web application utilizing a serverless architecture:

* **Frontend:** React (Next.js 14+ with App Router)
* **Styling:** CSS Modules (SCSS) + Tailwind-inspired utility classes
* **Backend as a Service (BaaS):** Supabase (PostgreSQL, Auth, Storage)
* **Data Fetching:** Direct Supabase Client Integration

## 🔐 Core Technical Decisions

* **Hardware-Level Multi-Tenancy:** Data isolation is enforced at the database engine level. Every core table (`profiles`, `participants`, `shifts`, `care_notes`) is bound by an `agency_id`, ensuring strict tenant data separation.
* **Audit Trail Compliance:** Hard deletions (`DELETE`) are strictly prohibited for transactional medical records. The system utilizes a `deleted_at` column (Soft Deletes) to maintain an immutable history of shifts and care notes.
* **File Storage:** Secure bucket handling via Supabase Storage for user avatars and medical documents.
* **Role-Based Access Control (RBAC):** Users are assigned specific roles (`admin` or `worker`) which dictate UI rendering and data access.

## 📍 Current Progress (MVP Roadmap)

- [x] **Phase 1:** System architecture, design tokens, and business logic definition.
- [x] **Phase 2:** Database schema design, Multi-tenant structure, and Supabase initialization.
- [x] **Phase 3:** Frontend UI Foundation (Sidebar, TopHeader, Global SCSS).
- [x] **Phase 4:** **Worker Portal Implementation**
  - [x] Live GPS Shift Clock-In / Clock-Out (`/dashboard`)
  - [x] Shift Calendar & List views (`/my-shifts`)
  - [x] Participant Medical Profiles & Slide-over Drawer (`/participants`)
  - [x] Supabase Storage integration for Profile Pictures (`/settings`)
  - [x] UX Polish (react-hot-toast notifications, responsive mobile design)
- [ ] **Phase 5:** **Admin / Coordinator Portal Implementation** *(Currently in progress)*
  - [ ] Admin Dashboard & Live Map
  - [ ] Rostering & Shift Assignment Engine
  - [ ] Staff & Participant Management
  - [ ] Compliance & Incident Audit Trail
- [ ] **Phase 6:** Next.js Middleware Auth Protection & Role-based Routing.
- [ ] **Phase 7:** Vercel Production Deployment.