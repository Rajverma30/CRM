'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Search, Users, FolderKanban, ListTodo, UserCheck, Target, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  category: string
  href: string
  icon: typeof Users
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { profile } = useAuth()
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !profile?.tenant_id) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    const tid = profile.tenant_id
    const pattern = `%${q}%`

    const [clients, employees, projects, tasks, leads, proposals] = await Promise.all([
      supabase.from('clients').select('id, business_name').eq('tenant_id', tid).ilike('business_name', pattern).limit(5),
      supabase.from('profiles').select('id, full_name').eq('tenant_id', tid).ilike('full_name', pattern).limit(5),
      supabase.from('projects').select('id, name').eq('tenant_id', tid).ilike('name', pattern).limit(5),
      supabase.from('tasks').select('id, title').eq('tenant_id', tid).ilike('title', pattern).limit(5),
      supabase.from('leads').select('id, business_name').eq('tenant_id', tid).ilike('business_name', pattern).limit(5),
      supabase.from('proposals').select('id, proposal_number').eq('tenant_id', tid).ilike('proposal_number', pattern).limit(5),
    ])

    const items: SearchResult[] = [
      ...(clients.data ?? []).map(c => ({ id: c.id, title: c.business_name, category: 'Clients', href: `/clients/${c.id}`, icon: Users })),
      ...(employees.data ?? []).map(e => ({ id: e.id, title: e.full_name, category: 'Employees', href: `/employees/${e.id}`, icon: UserCheck })),
      ...(projects.data ?? []).map(p => ({ id: p.id, title: p.name, category: 'Projects', href: `/projects/${p.id}`, icon: FolderKanban })),
      ...(tasks.data ?? []).map(t => ({ id: t.id, title: t.title, category: 'Tasks', href: `/tasks/${t.id}`, icon: ListTodo })),
      ...(leads.data ?? []).map(l => ({ id: l.id, title: l.business_name, category: 'Leads', href: `/leads/${l.id}`, icon: Target })),
      ...(proposals.data ?? []).map(p => ({ id: p.id, title: p.proposal_number, category: 'Proposals', href: `/proposals/${p.id}`, icon: FileText })),
    ]

    setResults(items)
    setSelectedIndex(0)
    setLoading(false)
  }, [profile?.tenant_id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    ;(acc[r.category] ??= []).push(r)
    return acc
  }, {})

  let flatIndex = -1

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-md hover:bg-muted/50 transition-colors w-full max-w-xs"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
        <DialogContent className="p-0 gap-0 max-w-lg">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search clients, projects, tasks..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {loading && <p className="text-sm text-muted-foreground p-4 text-center">Searching...</p>}
            {!loading && query && !results.length && (
              <p className="text-sm text-muted-foreground p-4 text-center">No results found</p>
            )}
            {!loading && Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">{category}</p>
                {items.map(item => {
                  flatIndex++
                  const idx = flatIndex
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md text-left',
                        idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      )}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
