-- ============================================================
-- PASTE THIS ENTIRE FILE IN SUPABASE → SQL EDITOR → RUN
-- Fixes client create RLS error + adds Excel lead columns
-- ============================================================

-- 1) Fix infinite recursion on project_members
CREATE OR REPLACE FUNCTION get_user_tenant()
RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER FUNCTION get_user_tenant() SET row_security = off;
ALTER FUNCTION get_user_role() SET row_security = off;

CREATE OR REPLACE FUNCTION user_can_see_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.project_id = p_project_id
      AND p.tenant_id = get_user_tenant()
      AND (
        get_user_role() = 'admin'
        OR pm.profile_id = auth.uid()
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER FUNCTION user_can_see_project_member(uuid) SET row_security = off;

DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin'
    OR user_can_see_project_member(id)
  )
);

DROP POLICY IF EXISTS project_members_select ON project_members;
CREATE POLICY project_members_select ON project_members FOR SELECT USING (
  user_can_see_project_member(project_id)
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_2 text;

-- 2) Excel lead import columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating numeric(3, 1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reviews integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude numeric(10, 7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude numeric(10, 7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score integer;

CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);
