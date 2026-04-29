-- 1. Activate Row-Level Security (RLS) on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_notes ENABLE ROW LEVEL SECURITY;

-- 2. Policies for Agencies
-- the user can only see their own agency
CREATE POLICY "Users can view their own agency"
ON agencies FOR SELECT
USING (id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid AND deleted_at IS NULL);

-- 3. policies for Profiles (Workers)
-- A user can only see profiles of their own agency
CREATE POLICY "Users can view profiles in their agency"
ON profiles FOR SELECT
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid AND deleted_at IS NULL);

-- a user can only create profiles in their own agency
CREATE POLICY "Users can update profiles in their agency"
ON profiles FOR UPDATE
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- 4. policies for Shifts
-- A user can only see shifts of their own agency
CREATE POLICY "Users can view shifts in their agency"
ON shifts FOR SELECT
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid AND deleted_at IS NULL);

CREATE POLICY "Users can insert shifts for their agency"
ON shifts FOR INSERT
WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

CREATE POLICY "Users can update shifts in their agency"
ON shifts FOR UPDATE
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- 5. care notes policies
CREATE POLICY "Users can view care notes in their agency"
ON care_notes FOR SELECT
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid AND deleted_at IS NULL);

CREATE POLICY "Users can insert care notes for their agency"
ON care_notes FOR INSERT
WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

CREATE POLICY "Users can update care notes in their agency"
ON care_notes FOR UPDATE
USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);