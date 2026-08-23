'use client'

import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PhoneFilter, SearchFormState, WebsiteFilter } from '@/lib/lead-finder/types'

const BUSINESS_TYPE_GROUPS = [
  {
    title: 'Healthcare',
    options: [
      'Healthcare',
      'Clinic',
      'Dental Clinic',
      'Dentist',
      'Physiotherapy Clinic',
      'Skin Clinic',
      'Dermatology Clinic',
      'Hair Transplant Clinic',
      'Diagnostic Center',
      'Pathology Lab',
      'Eye Hospital',
      'Eye Clinic',
      'Ayurvedic Clinic',
      'Home Healthcare',
      'Nursing Service',
      'Physiotherapist',
      'Orthopedic Clinic',
      'Fertility Clinic',
      'Gynecologist',
      'Pediatrician',
      'Cosmetic Clinic',
    ],
  },
  {
    title: 'Real Estate',
    options: [
      'Real Estate Agency',
      'Property Dealer',
      'Real Estate Consultant',
      'Property Consultant',
      'Real Estate Developer',
      'Builder',
      'Commercial Property Dealer',
      'Residential Property Dealer',
      'Property Management',
      'Real Estate Broker',
    ],
  },
  {
    title: 'High-value Local Services',
    options: [
      'Interior Designer',
      'Architect',
      'Construction Company',
      'Modular Kitchen',
      'Home Renovation',
      'Solar Company',
      'CCTV Installation',
      'Security Services',
      'Pest Control',
      'Cleaning Services',
      'Home Automation',
      'Waterproofing Company',
      'Electrical Contractor',
      'Plumbing Service',
    ],
  },
  {
    title: 'Beauty / Lifestyle',
    options: [
      'Salon',
      'Beauty Salon',
      'Unisex Salon',
      'Spa',
      'Skin Care',
      'Beauty Clinic',
      'Makeup Artist',
      'Bridal Makeup',
      'Hair Salon',
      'Nail Salon',
      'Tattoo Studio',
      'Gym',
      'Fitness Center',
      'Yoga Studio',
    ],
  },
  {
    title: 'Education',
    options: [
      'Coaching Institute',
      'IIT JEE Coaching',
      'NEET Coaching',
      'UPSC Coaching',
      'Competitive Exam Coaching',
      'IELTS Coaching',
      'Spoken English Institute',
      'Computer Institute',
      'Coding Institute',
      'Skill Development Institute',
      'Preschool',
      'Play School',
    ],
  },
  {
    title: 'Food / Hospitality',
    options: [
      'Restaurant',
      'Cafe',
      'Bakery',
      'Cloud Kitchen',
      'Catering Service',
      'Banquet Hall',
      'Wedding Venue',
      'Hotel',
      'Resort',
    ],
  },
  {
    title: 'B2B',
    options: [
      'Manufacturing Company',
      'Packaging Company',
      'Printing Company',
      'Industrial Supplier',
      'Machine Manufacturer',
      'Textile Manufacturer',
      'Pharmaceutical Company',
      'Logistics Company',
      'Transport Company',
      'Corporate Training',
    ],
  },
] as const

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

  const selectedBusinessTypes = value.business_type
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  const toggleBusinessType = (option: string) => {
    const current = value.business_type
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    const next = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option]

    update('business_type', next.join(', '))
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="business_type">Business category</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Choose types
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(90vw,900px)] p-0">
                    <div className="max-h-[70vh] overflow-y-auto p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Business types</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => update('business_type', '')}
                        >
                          Clear
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {BUSINESS_TYPE_GROUPS.map(group => (
                          <div key={group.title} className="space-y-2 rounded-md border p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {group.title}
                            </p>
                            {group.options.map(option => {
                              const checked = selectedBusinessTypes.includes(option)
                              return (
                                <label
                                  key={option}
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleBusinessType(option)}
                                  />
                                  <span>{option}</span>
                                </label>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Input
                id="business_type"
                placeholder="Salon, Restaurant, Gym…"
                value={value.business_type}
                onChange={e => update('business_type', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Select one or more categories, or type your own custom query.
              </p>
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
