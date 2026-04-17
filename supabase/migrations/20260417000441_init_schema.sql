
CREATE TYPE user_role AS ENUM ('admin', 'worker');
CREATE TYPE shift_status AS ENUM ('pending_approval', 'approved', 'disputed');

-- CORE SCHEMA FOR NDIS CARE MANAGEMENT SYSTEM
-- 1. Agency (Tenant)
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Profiles (Extiende auth.users de Supabase)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES agencies(id),
    role user_role NOT NULL DEFAULT 'worker',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Participant
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    ndis_id VARCHAR(50), -- String
    emergency_contact TEXT,
    medical_alerts TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Shift
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    worker_id UUID NOT NULL REFERENCES profiles(id),
    participant_id UUID NOT NULL REFERENCES participants(id),
    start_time TIMESTAMPTZ NOT NULL, -- UTC
    end_time TIMESTAMPTZ, -- Nullable until clock-out
    status shift_status NOT NULL DEFAULT 'pending_approval',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. Care Note
CREATE TABLE care_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    worker_id UUID NOT NULL REFERENCES profiles(id),
    participant_id UUID NOT NULL REFERENCES participants(id),
    shift_id UUID REFERENCES shifts(id), -- Nullable para notas independientes
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX idx_profiles_agency_active ON profiles(agency_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_participants_agency_active ON participants(agency_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_agency_active ON shifts(agency_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_care_notes_agency_active ON care_notes(agency_id) WHERE deleted_at IS NULL;

-- RLS Policies
-- Allow RLS in tables
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Reading policy (SELECT): 
-- You can only see participants if your JWT has the same agency_id and the record is not deleted.
CREATE POLICY "Tenants can view their own active participants"
ON participants FOR SELECT
USING (
    agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND deleted_at IS NULL
);

-- Writing policy (INSERT):
-- You can only insert if you assign your own agency_id to the record. This ensures that workers can only create participants for their own agency.
CREATE POLICY "Tenants can insert participants for their agency"
ON participants FOR INSERT
WITH CHECK (
    agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
);