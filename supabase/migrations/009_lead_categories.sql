ALTER TABLE leads ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_subcategory ON leads(subcategory);