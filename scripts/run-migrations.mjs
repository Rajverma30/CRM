/**
 * Run pending SQL migrations against Supabase Postgres.
 * Requires SUPABASE_DB_PASSWORD in .env (Supabase → Settings → Database → password)
 *
 * Usage: node scripts/run-migrations.mjs
 */
import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
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
const password = process.env.SUPABASE_DB_PASSWORD
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef || !password) {
  console.error(`
Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD.

Add your database password to .env:
  SUPABASE_DB_PASSWORD=your-db-password

Find it in Supabase Dashboard → Project Settings → Database → Database password
`)
  process.exit(1)
}

const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const migrationsDir = resolve(root, 'supabase/migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `)

  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file])
    if (rows.length) {
      console.log(`Skip ${file} (already applied)`)
      continue
    }

    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`Applied ${file}`)
  }

  await client.end()
  console.log('All migrations applied.')
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
