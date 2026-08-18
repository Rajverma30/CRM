'use client'

import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PhoneFilter, SearchFormState, WebsiteFilter } from '@/lib/lead-finder/types'

interface SearchFormProps {
  value: SearchFormState
  loading: boolean
  onChange: (next: SearchFormState) => void
  onSubmit: () => void
}

export function LeadFinderSearchForm({ value, loading, onChange, onSubmit }: SearchFormProps) {
  const update = <K extends keyof SearchFormState>(key: K, val: SearchFormState[K]) => {
    onChange({ ...value, [key]: val, page: 1 })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Search businesses</CardTitle>
            <CardDescription>
              Find and filter Google Places leads by category, location, and rating.
            </CardDescription>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox
              checked={value.potential_web_dev_leads}
              onCheckedChange={checked => update('potential_web_dev_leads', checked === true)}
            />
            Potential Web Development Leads
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="business_type">Business category</Label>
              <Input
                id="business_type"
                placeholder="Salon, Restaurant, Gym…"
                value={value.business_type}
                onChange={e => update('business_type', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location(s)</Label>
              <Textarea
                id="location"
                placeholder={'Indore, Bhopal, Delhi\nor one city per line'}
                value={value.location}
                onChange={e => update('location', e.target.value)}
                required
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Multiple cities: comma, semicolon, or new line. Max 15.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_rating">Minimum rating</Label>
              <Input
                id="min_rating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={value.min_rating}
                onChange={e => update('min_rating', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_rating">Maximum rating</Label>
              <Input
                id="max_rating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={value.max_rating}
                onChange={e => update('max_rating', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_filter">Website</Label>
              <Select
                value={value.website_filter}
                onValueChange={v => update('website_filter', v as WebsiteFilter)}
              >
                <SelectTrigger id="website_filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="has_website">Has website</SelectItem>
                  <SelectItem value="no_website">No website</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_filter">Phone number</Label>
              <Select
                value={value.phone_filter}
                onValueChange={v => update('phone_filter', v as PhoneFilter)}
              >
                <SelectTrigger id="phone_filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="has_phone">Has phone number</SelectItem>
                  <SelectItem value="no_phone">No phone number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_reviews">Minimum reviews</Label>
              <Input
                id="min_reviews"
                type="number"
                min={0}
                value={value.min_reviews}
                onChange={e => update('min_reviews', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_reviews">Maximum reviews</Label>
              <Input
                id="max_reviews"
                type="number"
                min={0}
                placeholder="No max"
                value={value.max_reviews}
                onChange={e => update('max_reviews', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search leads'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={value.deep_search}
                onCheckedChange={checked => update('deep_search', checked === true)}
              />
              Deep search (more results, uses more API quota)
            </label>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
