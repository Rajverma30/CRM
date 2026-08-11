'use client'

import { forwardRef } from 'react'
import { type ProposalDetail } from '@/lib/queries/use-proposals'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ProposalPDFProps {
  proposal: ProposalDetail
}

export const ProposalPDF = forwardRef<HTMLDivElement, ProposalPDFProps>(
  function ProposalPDF({ proposal }, ref) {
    const contact = proposal.client || proposal.lead
    const subtotal = proposal.proposal_items.reduce((sum, item) => sum + item.total, 0)
    const discountAmount = proposal.discount || 0
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (proposal.tax / 100)
    const grandTotal = taxableAmount + taxAmount

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-[800px] mx-auto print:p-0 print:max-w-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vraizen Tech</h1>
            <p className="text-sm text-gray-600 mt-1">Pipliyahna, World Cup Square</p>
            <p className="text-sm text-gray-600">Indore, Madhya Pradesh</p>
            <p className="text-sm text-gray-600 mt-1">+91 62656 60387 | +91 62321 61851</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-800">PROPOSAL</h2>
            <p className="text-sm text-gray-600 mt-2"><span className="font-medium">No:</span> {proposal.proposal_number}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Date:</span> {formatDate(proposal.created_at)}</p>
            {proposal.valid_until && (
              <p className="text-sm text-gray-600"><span className="font-medium">Valid Until:</span> {formatDate(proposal.valid_until)}</p>
            )}
          </div>
        </div>

        {/* Client Info */}
        {contact && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Prepared For</h3>
            <p className="font-semibold text-gray-900">{contact.business_name}</p>
            {contact.contact_person && <p className="text-sm text-gray-600">{contact.contact_person}</p>}
            {contact.email && <p className="text-sm text-gray-600">{contact.email}</p>}
            {contact.phone && <p className="text-sm text-gray-600">{contact.phone}</p>}
            {(contact as any).address && <p className="text-sm text-gray-600">{(contact as any).address}</p>}
          </div>
        )}

        {/* Line Items */}
        <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 text-sm font-semibold text-gray-700">#</th>
              <th className="text-left py-3 text-sm font-semibold text-gray-700">Service</th>
              <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700">Qty</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {proposal.proposal_items.map((item, i) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-3 text-sm text-gray-600">{i + 1}</td>
                <td className="py-3 text-sm font-medium">{item.service}</td>
                <td className="py-3 text-sm text-gray-600">{item.description || '—'}</td>
                <td className="py-3 text-sm text-right">{item.quantity}</td>
                <td className="py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-3 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({proposal.tax}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t-2 border-gray-800 pt-2">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {proposal.timeline && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Timeline</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.timeline}</p>
          </div>
        )}

        {/* Terms */}
        {proposal.terms && (
          <div className="mb-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms & Conditions</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.terms}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 mt-8 text-center text-xs text-gray-400">
          <p>This proposal was generated by Vraizen Tech CRM</p>
        </div>
      </div>
    )
  }
)

export function downloadPDF() {
  window.print()
}
