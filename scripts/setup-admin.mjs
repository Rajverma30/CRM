/**
 * One-time bootstrap: creates tenant + admin profile for an auth user.
 * Usage: node scripts/setup-admin.mjs [email]
 */
import { createClient } from '@supabase/supabase-js'
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
      // file may not exist
    }
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]

if (!email) {
  console.error('Usage: node scripts/setup-admin.mjs <email>')
  console.error('Example: node scripts/setup-admin.mjs admin@company.com')
  process.exit(1)
}

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Looking up auth user: ${email}`)

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  const authUser = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) {
    console.error(`No auth user found for ${email}. Create the user in Supabase Auth first.`)
    process.exit(1)
  }

  console.log(`Found auth user: ${authUser.id}`)

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role, tenant_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (existingProfile) {
    console.log('Profile already exists:', existingProfile)
    return
  }

  let tenantId

  const { data: tenants } = await supabase.from('tenants').select('id, name').limit(1)
  if (tenants?.length) {
    tenantId = tenants[0].id
    console.log(`Using existing tenant: ${tenants[0].name} (${tenantId})`)
  } else {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Vraizen Tech',
        email: email,
        phone: '',
        website: '',
      })
      .select('id')
      .single()

    if (tenantError) {
      console.error('Failed to create tenant:', tenantError.message)
      process.exit(1)
    }
    tenantId = tenant.id
    console.log(`Created tenant: Vraizen Tech (${tenantId})`)
  }

  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'Admin'

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      tenant_id: tenantId,
      email: authUser.email,
      full_name: fullName,
      role: 'admin',
      is_active: true,
    })
    .select()
    .single()

  if (profileError) {
    console.error('Failed to create profile:', profileError.message)
    process.exit(1)
  }

  console.log('Admin profile created:', profile)

  const defaultServices = [
    'Website',
    'E-commerce',
    'Website Maintenance',
    'SEO',
    'Meta Ads',
    'Google Ads',
    'AI Chatbot',
    'AI Automation',
    'Other',
  ]

  const { data: existingServices } = await supabase
    .from('services')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!existingServices?.length) {
    const { error: servicesError } = await supabase.from('services').insert(
      defaultServices.map((name) => ({ tenant_id: tenantId, name }))
    )
    if (servicesError) {
      console.warn('Could not seed services:', servicesError.message)
    } else {
      console.log(`Seeded ${defaultServices.length} default services`)
    }
  }

  console.log('\nDone! Log in again at http://localhost:3000/login')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
