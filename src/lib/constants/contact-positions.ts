export const CONTACT_POSITIONS = [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'Founder',
  'Director',
  'VP Sales',
  'VP Marketing',
  'HR Manager',
  'Project Manager',
  'Software Engineer',
  'Designer',
  'Marketing Manager',
  'Sales Manager',
  'Account Manager',
  'Operations Manager',
  'Business Analyst',
  'Consultant',
  'Other',
] as const

export type ContactPosition = (typeof CONTACT_POSITIONS)[number]
