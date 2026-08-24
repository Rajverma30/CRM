ALTER TABLE leads ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_subcategory ON leads(subcategory);
UPDATE leads
SET category = 'Real Estate',
		subcategory = COALESCE(subcategory, 'Broker / Agent')
WHERE category IS NULL
	AND (
		industry ILIKE '%real estate%'
		OR industry ILIKE '%property%'
		OR industry ILIKE '%builder%'
		OR industry ILIKE '%broker%'
	);