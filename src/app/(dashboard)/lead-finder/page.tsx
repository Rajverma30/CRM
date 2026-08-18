'use client'

import { useCallback, useEffect, useState } from 'react'
import { ScanSearch } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/auth-context'
import { searchBusinesses, downloadCachedExport } from '@/lib/lead-finder/client'
import { loadCachedSearch, saveCachedSearch } from '@/lib/lead-finder/cache'
import type { SearchFormState, SearchResponse } from '@/lib/lead-finder/types'
import { LeadFinderSearchForm } from '@/components/modules/lead-finder/search-form'
import { LeadFinderResultsTable } from '@/components/modules/lead-finder/results-table'
import { LeadFinderExportButtons } from '@/components/modules/lead-finder/export-buttons'
import { LeadFinderLoadingState } from '@/components/modules/lead-finder/loading-state'

const INITIAL_FORM: SearchFormState = {
  business_type: 'Salon',
  location: 'Indore, Bhopal',
  min_rating: 0,
  max_rating: 5,
  website_filter: 'all',
  phone_filter: 'all',
  min_reviews: 0,
  max_reviews: '',
  potential_web_dev_leads: false,
  deep_search: false,
  page: 1,
  page_size: 2000,
}

export default function LeadFinderPage() {
  const { isAdmin } = useAuth()
  const [form, setForm] = useState<SearchFormState>(INITIAL_FORM)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const cached = loadCachedSearch()
    if (!cached) return
    setForm({ ...INITIAL_FORM, ...cached.form, page: 1, page_size: 2000 })
    setResult(cached.result)
    setHasSearched(true)
  }, [])

  const runSearch = useCallback(async (params: SearchFormState) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      if (params.min_rating > params.max_rating) {
        throw new Error('Minimum rating cannot be greater than maximum rating.')
      }
      if (params.max_reviews.trim() !== '' && Number(params.max_reviews) < params.min_reviews) {
        throw new Error('Minimum reviews cannot be greater than maximum reviews.')
      }

      const searchParams = { ...params, page: 1, page_size: 2000 }
      const data = await searchBusinesses(searchParams)
      setResult(data)
      setForm(searchParams)
      saveCachedSearch(searchParams, data)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!result || result.businesses.length === 0) {
      setError('No cached results to export. Run a search first.')
      return
    }
    setExporting(format)
    setError(null)
    try {
      await downloadCachedExport(format, result.businesses, {
        business_type: result.query || form.business_type,
        location: result.location || form.location,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(null)
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ScanSearch}
        title="Access Denied"
        description="Only admins can access Lead Finder."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Finder"
        description="Discover local businesses from Google Places, score web-development opportunities, and export lead lists."
      />

      <LeadFinderSearchForm
        value={form}
        loading={loading}
        onChange={setForm}
        onSubmit={() => void runSearch({ ...form, page: 1 })}
      />

      {loading && <LeadFinderLoadingState />}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && !loading && (
        <section className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end justify-between gap-4 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Results
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {result.total} business{result.total === 1 ? '' : 'es'} found
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full list saved in this browser · Fetched {result.raw_fetched} unique places
                  before filters · {result.query} in {result.location}
                </p>
              </div>
              <LeadFinderExportButtons
                disabled={result.total === 0}
                exporting={exporting}
                onExport={handleExport}
              />
            </CardContent>
          </Card>

          {result.total === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No businesses matched your filters. Try widening the rating range or disabling
                Potential Web Development Leads.
              </CardContent>
            </Card>
          ) : (
            <>
              <LeadFinderResultsTable businesses={result.businesses} />
              <p className="text-xs text-muted-foreground">{result.coverage_note}</p>
            </>
          )}
        </section>
      )}

      {!hasSearched && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Ready when you are</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Enter a business category and city, set your rating window, then search to build a lead list.
              Export results and import them into Leads via Upload Excel.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground border-t pt-4">
        Powered by Google Places API (New). Results are relevance-based and may not cover every
        business in a city. API keys stay on the server.
      </p>
    </div>
  )
}
