import { NextRequest, NextResponse } from 'next/server'
import { requireLeadFinderAdmin } from '@/lib/lead-finder/auth'
import { getLeadFinderConfig } from '@/lib/lead-finder/config'
import { exportCsv, exportFilename, exportXlsx } from '@/lib/lead-finder/export'
import { checkRateLimit, clientIp, RateLimitError } from '@/lib/lead-finder/rate-limit'
import type { BusinessLead, CachedExportRequest } from '@/lib/lead-finder/types'

export async function POST(request: NextRequest) {
  const auth = await requireLeadFinderAdmin()
  if ('error' in auth && auth.error) return auth.error

  try {
    const config = getLeadFinderConfig()
    checkRateLimit(clientIp(request), config.rateLimitPerMinute)

    const body = (await request.json()) as CachedExportRequest
    const format = body.format
    const businesses = body.businesses as BusinessLead[]

    if (format !== 'csv' && format !== 'xlsx') {
      return NextResponse.json(
        { detail: { message: 'Invalid export format.', code: 'validation_error' } },
        { status: 422 }
      )
    }

    if (!Array.isArray(businesses) || !businesses.length) {
      return NextResponse.json(
        { detail: { message: 'No cached results to export.', code: 'validation_error' } },
        { status: 422 }
      )
    }

    const filename = exportFilename(
      body.business_type || 'leads',
      body.location || 'export',
      format
    )

    if (format === 'csv') {
      const content = exportCsv(businesses)
      return new NextResponse(new Uint8Array(content), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const content = exportXlsx(businesses)
    return new NextResponse(new Uint8Array(content), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { detail: { message: error.message, code: 'rate_limited' } },
        { status: 429 }
      )
    }
    console.error('Lead finder export error:', error)
    return NextResponse.json(
      { detail: { message: 'Export failed.', code: 'internal_error' } },
      { status: 500 }
    )
  }
}
