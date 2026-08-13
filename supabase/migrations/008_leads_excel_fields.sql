-- 008_leads_excel_fields.sql
-- Extra fields for Google Maps / Excel lead imports

ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating numeric(3, 1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reviews integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude numeric(10, 7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude numeric(10, 7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score integer;

CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);
