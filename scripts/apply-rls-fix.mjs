/**
 * Apply RLS recursion fix + optional phone_2 column to live Supabase DB.
 * Prefers SUPABASE_DB_PASSWORD; falls back to trying service-role as password (usually fails).
 *
 * Usage: node scripts/apply-rls-fix.mjs
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(resolve(root, file), 'utf8')
      for (const line of text.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m && !process.env[m[1].trim()]) {
          process.env[m[1].trim()] = m[2].trim()
        }
      }
    } catch {
      // optional
    }
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef || !password) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or DB credentials')
  process.exit(1)
}

const SQL = `
-- Fix helper functions (profiles <-> helpers cycle)
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

-- Break projects <-> project_members policy cycle
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

-- Optional second phone on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_2 text;
`

const hosts = [
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
]

async function main() {
  let lastErr = null
  for (const connectionString of hosts) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    try {
      await client.connect()
      console.log('Connected via', connectionString.split('@')[1])
      await client.query(SQL)
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          name text PRIMARY KEY,
          applied_at timestamptz DEFAULT now()
        )
      `)
      await client.query(
        `INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        ['007_fix_project_members_rls.sql']
      )
      console.log('RLS fix applied successfully')
      await client.end()
      return
    } catch (err) {
      lastErr = err
      console.log('Failed:', connectionString.split('@')[1], '-', err.message)
      try {
        await client.end()
      } catch {
        // ignore
      }
    }
  }
  console.error('Could not apply SQL:', lastErr?.message)
  process.exit(1)
}

main()
