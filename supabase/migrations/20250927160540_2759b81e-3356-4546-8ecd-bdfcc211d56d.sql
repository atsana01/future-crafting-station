-- Add unique constraint to prevent duplicate invoices per quote
-- First, clean up any duplicate invoices (keep the most recent one)
WITH duplicate_invoices AS (
  SELECT id, quote_id, 
         ROW_NUMBER() OVER (PARTITION BY quote_id ORDER BY created_at DESC) as rn
  FROM invoices
)
DELETE FROM invoices 
WHERE id IN (
  SELECT id FROM duplicate_invoices WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE invoices 
ADD CONSTRAINT unique_invoice_per_quote 
UNIQUE (quote_id);