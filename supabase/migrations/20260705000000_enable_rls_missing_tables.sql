-- Migration: enable RLS on worker_certifications, worker_participants, incident_reports
-- These tables were created outside of tracked migrations and had no RLS.
-- Run this SQL in the Supabase SQL Editor (supabase db push requires Docker).

-- ============================================================
-- worker_certifications
-- ============================================================
ALTER TABLE public.worker_certifications ENABLE ROW LEVEL SECURITY;

-- Agency members can view certifications for workers in their agency
CREATE POLICY "Agency members can view worker certifications"
ON public.worker_certifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = worker_certifications.worker_id
    AND profiles.agency_id = ((auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
  )
);

-- ============================================================
-- worker_participants
-- ============================================================
ALTER TABLE public.worker_participants ENABLE ROW LEVEL SECURITY;

-- Agency members can view worker-participant assignments in their agency
CREATE POLICY "Agency members can view worker participants"
ON public.worker_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = worker_participants.worker_id
    AND profiles.agency_id = ((auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
  )
);

-- ============================================================
-- incident_reports
-- ============================================================
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Agency members can view incidents belonging to their agency
CREATE POLICY "Agency members can view own agency incidents"
ON public.incident_reports FOR SELECT
TO authenticated
USING (
  agency_id = ((auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
);

-- Agency members can create incidents for their own agency
CREATE POLICY "Agency members can insert incidents"
ON public.incident_reports FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = ((auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
);
