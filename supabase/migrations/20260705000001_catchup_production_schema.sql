-- Catch-up migration: columns and tables added directly in Supabase Studio
-- that were never tracked in migration files.
-- All statements use IF NOT EXISTS / IF NOT EXISTS guards so they are
-- safe to run against production (already has these) and against a
-- fresh local environment (will create them).
--
-- Run in Supabase SQL Editor if supabase db push is unavailable (Docker).

-- ============================================================
-- participants — extra columns added post-initial-migration
-- ============================================================
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS mobility_notes text,
  ADD COLUMN IF NOT EXISTS medical_condition_tag text,
  ADD COLUMN IF NOT EXISTS address text;

-- ============================================================
-- profiles — extra columns added post-initial-migration
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- ============================================================
-- incident_reports — table created outside migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  worker_id uuid REFERENCES public.profiles(id),
  participant_id uuid REFERENCES public.participants(id),
  shift_id uuid REFERENCES public.shifts(id),
  status text NOT NULL DEFAULT 'open',
  initial_description text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- worker_policies — table created outside migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.worker_policies (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  worker_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);
