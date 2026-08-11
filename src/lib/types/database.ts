export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'employee';
export type ClientStatus = 'lead' | 'active' | 'inactive' | 'completed' | 'lost';
export type ProjectStatus = 'planning' | 'in_progress' | 'testing' | 'waiting_for_client' | 'completed' | 'on_hold' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'completed';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';
export type LeadStatus = 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';
export type LeadSource = 'google_maps' | 'instagram' | 'referral' | 'website' | 'whatsapp' | 'cold_call' | 'other';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
export type RequestStatus = 'new' | 'reviewing' | 'approved' | 'converted' | 'completed' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';

interface TableDef<Row, Insert, Update> {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
}

// ---- Row types ----

export interface TenantRow {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency: string;
  proposal_terms: string | null;
  invoice_terms: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  department: string | null;
  joining_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  tenant_id: string;
  business_name: string;
  contact_person: string | null;
  contact_position: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  industry: string | null;
  website_url: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceRow {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export interface ClientServiceRow {
  id: string;
  client_id: string;
  service_id: string;
}

export interface ProjectRow {
  id: string;
  tenant_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  start_date: string | null;
  deadline: string | null;
  budget: number | null;
  status: ProjectStatus;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberRow {
  id: string;
  project_id: string;
  profile_id: string;
}

export interface TaskRow {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentRow {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface ClientRequestRow {
  id: string;
  tenant_id: string;
  client_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: RequestStatus;
  created_by: string | null;
  converted_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  tenant_id: string;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  website: string | null;
  source: LeadSource;
  interested_service: string | null;
  estimated_budget: number | null;
  notes: string | null;
  assigned_to: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface ProposalRow {
  id: string;
  tenant_id: string;
  client_id: string | null;
  lead_id: string | null;
  proposal_number: string;
  valid_until: string | null;
  timeline: string | null;
  terms: string | null;
  status: ProposalStatus;
  discount: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface ProposalItemRow {
  id: string;
  proposal_id: string;
  service: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  client_id: string;
  service_id: string | null;
  amount: number;
  billing_cycle: BillingCycle;
  start_date: string;
  next_billing_date: string | null;
  last_payment_date: string | null;
  status: SubscriptionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  tenant_id: string;
  client_id: string;
  subscription_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  invoice_number: string | null;
  notes: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRow {
  id: string;
  tenant_id: string;
  profile_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  tenant_id: string;
  profile_id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Json;
  created_at: string;
}

// ---- Insert types (omit server-generated fields) ----

export type TenantInsert = Partial<TenantRow> & Pick<TenantRow, 'name'>;
export type ProfileInsert = Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'tenant_id' | 'email' | 'full_name'>;
export type ClientInsert = Partial<ClientRow> & Pick<ClientRow, 'tenant_id' | 'business_name'>;
export type ServiceInsert = Partial<ServiceRow> & Pick<ServiceRow, 'tenant_id' | 'name'>;
export type ClientServiceInsert = Partial<ClientServiceRow> & Pick<ClientServiceRow, 'client_id' | 'service_id'>;
export type ProjectInsert = Partial<ProjectRow> & Pick<ProjectRow, 'tenant_id' | 'name'>;
export type ProjectMemberInsert = Partial<ProjectMemberRow> & Pick<ProjectMemberRow, 'project_id' | 'profile_id'>;
export type TaskInsert = Partial<TaskRow> & Pick<TaskRow, 'tenant_id' | 'title'>;
export type TaskCommentInsert = Partial<TaskCommentRow> & Pick<TaskCommentRow, 'task_id' | 'author_id' | 'content'>;
export type ClientRequestInsert = Partial<ClientRequestRow> & Pick<ClientRequestRow, 'tenant_id' | 'client_id' | 'title'>;
export type LeadInsert = Partial<LeadRow> & Pick<LeadRow, 'tenant_id' | 'business_name'>;
export type ProposalInsert = Partial<ProposalRow> & Pick<ProposalRow, 'tenant_id' | 'proposal_number'>;
export type ProposalItemInsert = Partial<ProposalItemRow> & Pick<ProposalItemRow, 'proposal_id' | 'service' | 'unit_price' | 'total'>;
export type SubscriptionInsert = Partial<SubscriptionRow> & Pick<SubscriptionRow, 'tenant_id' | 'client_id' | 'amount' | 'start_date'>;
export type PaymentInsert = Partial<PaymentRow> & Pick<PaymentRow, 'tenant_id' | 'client_id' | 'amount' | 'payment_date'>;
export type AttendanceInsert = Partial<AttendanceRow> & Pick<AttendanceRow, 'tenant_id' | 'profile_id' | 'date'>;
export type NotificationInsert = Partial<NotificationRow> & Pick<NotificationRow, 'tenant_id' | 'profile_id' | 'title'>;
export type ActivityLogInsert = Partial<ActivityLogRow> & Pick<ActivityLogRow, 'tenant_id' | 'entity_type' | 'action'>;

// ---- Update types (all fields optional) ----

export type TenantUpdate = Partial<TenantRow>;
export type ProfileUpdate = Partial<ProfileRow>;
export type ClientUpdate = Partial<ClientRow>;
export type ServiceUpdate = Partial<ServiceRow>;
export type ClientServiceUpdate = Partial<ClientServiceRow>;
export type ProjectUpdate = Partial<ProjectRow>;
export type ProjectMemberUpdate = Partial<ProjectMemberRow>;
export type TaskUpdate = Partial<TaskRow>;
export type TaskCommentUpdate = Partial<TaskCommentRow>;
export type ClientRequestUpdate = Partial<ClientRequestRow>;
export type LeadUpdate = Partial<LeadRow>;
export type ProposalUpdate = Partial<ProposalRow>;
export type ProposalItemUpdate = Partial<ProposalItemRow>;
export type SubscriptionUpdate = Partial<SubscriptionRow>;
export type PaymentUpdate = Partial<PaymentRow>;
export type AttendanceUpdate = Partial<AttendanceRow>;
export type NotificationUpdate = Partial<NotificationRow>;
export type ActivityLogUpdate = Partial<ActivityLogRow>;

// ---- Database type ----

export interface Database {
  public: {
    Tables: {
      tenants: TableDef<TenantRow, TenantInsert, TenantUpdate>;
      profiles: TableDef<ProfileRow, ProfileInsert, ProfileUpdate>;
      clients: TableDef<ClientRow, ClientInsert, ClientUpdate>;
      services: TableDef<ServiceRow, ServiceInsert, ServiceUpdate>;
      client_services: TableDef<ClientServiceRow, ClientServiceInsert, ClientServiceUpdate>;
      projects: TableDef<ProjectRow, ProjectInsert, ProjectUpdate>;
      project_members: TableDef<ProjectMemberRow, ProjectMemberInsert, ProjectMemberUpdate>;
      tasks: TableDef<TaskRow, TaskInsert, TaskUpdate>;
      task_comments: TableDef<TaskCommentRow, TaskCommentInsert, TaskCommentUpdate>;
      client_requests: TableDef<ClientRequestRow, ClientRequestInsert, ClientRequestUpdate>;
      leads: TableDef<LeadRow, LeadInsert, LeadUpdate>;
      proposals: TableDef<ProposalRow, ProposalInsert, ProposalUpdate>;
      proposal_items: TableDef<ProposalItemRow, ProposalItemInsert, ProposalItemUpdate>;
      subscriptions: TableDef<SubscriptionRow, SubscriptionInsert, SubscriptionUpdate>;
      payments: TableDef<PaymentRow, PaymentInsert, PaymentUpdate>;
      attendance: TableDef<AttendanceRow, AttendanceInsert, AttendanceUpdate>;
      notifications: TableDef<NotificationRow, NotificationInsert, NotificationUpdate>;
      activity_logs: TableDef<ActivityLogRow, ActivityLogInsert, ActivityLogUpdate>;
    };
    Enums: {
      user_role: UserRole;
      client_status: ClientStatus;
      project_status: ProjectStatus;
      task_priority: TaskPriority;
      task_status: TaskStatus;
      billing_cycle: BillingCycle;
      subscription_status: SubscriptionStatus;
      payment_status: PaymentStatus;
      attendance_status: AttendanceStatus;
      lead_status: LeadStatus;
      lead_source: LeadSource;
      proposal_status: ProposalStatus;
      request_status: RequestStatus;
      payment_method: PaymentMethod;
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_tenant: {
        Args: Record<string, never>
        Returns: string
      }
    };
    CompositeTypes: Record<string, never>;
  };
}

// ---- Convenience type aliases ----

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];
export type Employee = Database['public']['Tables']['profiles']['Row'];
export type Profile = Employee;
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalItem = Database['public']['Tables']['proposal_items']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type ClientRequest = Database['public']['Tables']['client_requests']['Row'];
export type ClientService = Database['public']['Tables']['client_services']['Row'];
export type ProjectMember = Database['public']['Tables']['project_members']['Row'];
