-- 001_schema.sql - Vraizen Tech CRM/ERP Schema

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE client_status AS ENUM ('lead', 'active', 'inactive', 'completed', 'lost');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'testing', 'waiting_for_client', 'completed', 'on_hold', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'blocked');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'failed', 'refunded');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost');
CREATE TYPE lead_source AS ENUM ('google_maps', 'instagram', 'referral', 'website', 'whatsapp', 'cold_call', 'other');
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');
CREATE TYPE request_status AS ENUM ('new', 'reviewing', 'approved', 'converted', 'completed', 'rejected');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  currency text DEFAULT 'INR',
  proposal_terms text,
  invoice_terms text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role user_role DEFAULT 'employee',
  department text,
  joining_date date,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  business_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  industry text,
  website_url text,
  notes text,
  status client_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE (client_id, service_id)
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  start_date date,
  deadline date,
  budget numeric(12, 2),
  status project_status DEFAULT 'planning',
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (project_id, profile_id)
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'medium',
  status request_status DEFAULT 'new',
  created_by uuid REFERENCES profiles(id),
  converted_task_id uuid REFERENCES tasks(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  business_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  industry text,
  website text,
  source lead_source DEFAULT 'other',
  interested_service text,
  estimated_budget numeric(12, 2),
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  status lead_status DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid REFERENCES clients(id),
  lead_id uuid REFERENCES leads(id),
  proposal_number text NOT NULL,
  valid_until date,
  timeline text,
  terms text,
  status proposal_status DEFAULT 'draft',
  discount numeric(12, 2) DEFAULT 0,
  tax numeric(5, 2) DEFAULT 18,
  total numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  service text NOT NULL,
  description text,
  quantity integer DEFAULT 1,
  unit_price numeric(12, 2) NOT NULL,
  total numeric(12, 2) NOT NULL
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  amount numeric(12, 2) NOT NULL,
  billing_cycle billing_cycle DEFAULT 'monthly',
  start_date date NOT NULL,
  next_billing_date date,
  last_payment_date date,
  status subscription_status DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL,
  payment_date date NOT NULL,
  payment_method payment_method DEFAULT 'bank_transfer',
  transaction_ref text,
  invoice_number text,
  notes text,
  status payment_status DEFAULT 'paid',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  total_hours numeric(4, 2),
  status attendance_status DEFAULT 'present',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, date)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text,
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- tenant_id indexes
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_client_requests_tenant ON client_requests(tenant_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);

-- Foreign key indexes
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_profile ON project_members(profile_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_client_requests_client ON client_requests(client_id);
CREATE INDEX idx_client_services_client ON client_services(client_id);
CREATE INDEX idx_client_services_service ON client_services(service_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_proposals_client ON proposals(client_id);
CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_service ON subscriptions(service_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_attendance_profile ON attendance(profile_id);
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);

-- Status indexes
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_client_requests_status ON client_requests(status);

-- Date indexes
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_client_requests_updated_at BEFORE UPDATE ON client_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
