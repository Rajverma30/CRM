-- 002_rls.sql - Row Level Security policies

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_tenant()
RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prevent infinite recursion during RLS policy evaluation.
-- These helper functions read from `profiles`, which has RLS policies
-- that call back into these helpers. Disabling row security for the
-- helper functions breaks the cycle.
ALTER FUNCTION get_user_tenant() SET row_security = off;
ALTER FUNCTION get_user_role() SET row_security = off;

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANTS
-- ============================================================

CREATE POLICY tenants_select ON tenants FOR SELECT USING (id = get_user_tenant());

-- ============================================================
-- PROFILES
-- ============================================================

CREATE POLICY profiles_select ON profiles FOR SELECT USING (tenant_id = get_user_tenant());

CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  tenant_id = get_user_tenant() AND (get_user_role() = 'admin' OR id = auth.uid())
);

CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE POLICY clients_select ON clients FOR SELECT USING (tenant_id = get_user_tenant());

CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY clients_update ON clients FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY clients_delete ON clients FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- SERVICES
-- ============================================================

CREATE POLICY services_select ON services FOR SELECT USING (tenant_id = get_user_tenant());

CREATE POLICY services_insert ON services FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY services_update ON services FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY services_delete ON services FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- CLIENT_SERVICES
-- ============================================================

CREATE POLICY client_services_select ON client_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.tenant_id = get_user_tenant())
);

CREATE POLICY client_services_insert ON client_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

CREATE POLICY client_services_update ON client_services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

CREATE POLICY client_services_delete ON client_services FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE POLICY projects_select ON projects FOR SELECT USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = id AND pm.profile_id = auth.uid())
  )
);

CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY projects_update ON projects FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY projects_delete ON projects FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- PROJECT_MEMBERS
-- ============================================================

CREATE POLICY project_members_select ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.tenant_id = get_user_tenant())
  AND (get_user_role() = 'admin' OR profile_id = auth.uid())
);

CREATE POLICY project_members_insert ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

CREATE POLICY project_members_update ON project_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

CREATE POLICY project_members_delete ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.tenant_id = get_user_tenant())
  AND get_user_role() = 'admin'
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin' OR assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant()
);

CREATE POLICY tasks_update ON tasks FOR UPDATE USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin' OR assigned_to = auth.uid()
  )
);

CREATE POLICY tasks_delete ON tasks FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- TASK_COMMENTS
-- ============================================================

CREATE POLICY task_comments_select ON task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND t.tenant_id = get_user_tenant())
);

CREATE POLICY task_comments_insert ON task_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND t.tenant_id = get_user_tenant())
);

-- ============================================================
-- CLIENT_REQUESTS
-- ============================================================

CREATE POLICY client_requests_select ON client_requests FOR SELECT USING (
  tenant_id = get_user_tenant()
);

CREATE POLICY client_requests_insert ON client_requests FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant()
);

CREATE POLICY client_requests_update ON client_requests FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY client_requests_delete ON client_requests FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- LEADS
-- ============================================================

CREATE POLICY leads_select ON leads FOR SELECT USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY leads_insert ON leads FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY leads_update ON leads FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY leads_delete ON leads FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- PROPOSALS
-- ============================================================

CREATE POLICY proposals_select ON proposals FOR SELECT USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY proposals_insert ON proposals FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY proposals_update ON proposals FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY proposals_delete ON proposals FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- PROPOSAL_ITEMS
-- ============================================================

CREATE POLICY proposal_items_select ON proposal_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND p.tenant_id = get_user_tenant() AND get_user_role() = 'admin')
);

CREATE POLICY proposal_items_insert ON proposal_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND p.tenant_id = get_user_tenant() AND get_user_role() = 'admin')
);

CREATE POLICY proposal_items_update ON proposal_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND p.tenant_id = get_user_tenant() AND get_user_role() = 'admin')
);

CREATE POLICY proposal_items_delete ON proposal_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM proposals p WHERE p.id = proposal_id AND p.tenant_id = get_user_tenant() AND get_user_role() = 'admin')
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY subscriptions_delete ON subscriptions FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY payments_select ON payments FOR SELECT USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY payments_insert ON payments FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY payments_update ON payments FOR UPDATE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

CREATE POLICY payments_delete ON payments FOR DELETE USING (
  tenant_id = get_user_tenant() AND get_user_role() = 'admin'
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE POLICY attendance_select ON attendance FOR SELECT USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin' OR profile_id = auth.uid()
  )
);

CREATE POLICY attendance_insert ON attendance FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant() AND profile_id = auth.uid()
);

CREATE POLICY attendance_update ON attendance FOR UPDATE USING (
  tenant_id = get_user_tenant() AND profile_id = auth.uid()
);

CREATE POLICY attendance_delete ON attendance FOR DELETE USING (
  tenant_id = get_user_tenant() AND profile_id = auth.uid()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_select ON notifications FOR SELECT USING (
  profile_id = auth.uid()
);

CREATE POLICY notifications_update ON notifications FOR UPDATE USING (
  profile_id = auth.uid()
);

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================

CREATE POLICY activity_logs_select ON activity_logs FOR SELECT USING (
  tenant_id = get_user_tenant() AND (
    get_user_role() = 'admin' OR actor_id = auth.uid()
  )
);
