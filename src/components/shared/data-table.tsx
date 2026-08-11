'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './loading-spinner'
import { EmptyState } from './empty-state'
import { FileX2 } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  searchPlaceholder?: string
  searchKey?: string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  searchPlaceholder = 'Search...',
  searchKey,
  onRowClick,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('')
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [page, setPage] = React.useState(0)
  const [perPage, setPerPage] = React.useState(10)

  const filtered = React.useMemo(() => {
    if (!search || !searchKey) return data
    return data.filter(row => String(row[searchKey] ?? '').toLowerCase().includes(search.toLowerCase()))
  }, [data, search, searchKey])

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paginated = sorted.slice(page * perPage, (page + 1) * perPage)

  React.useEffect(() => { setPage(0) }, [search, perPage])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-left font-medium text-muted-foreground', col.sortable && 'cursor-pointer select-none', col.className)}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? (sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                        : <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState icon={FileX2} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  className={cn('border-t hover:bg-muted/30 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(perPage)} onValueChange={v => setPerPage(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>
              {page * perPage + 1}-{Math.min((page + 1) * perPage, sorted.length)} of {sorted.length}
            </span>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
