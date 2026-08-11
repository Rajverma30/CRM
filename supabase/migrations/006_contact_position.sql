-- Contact person job title / role at the client company
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_position text;
