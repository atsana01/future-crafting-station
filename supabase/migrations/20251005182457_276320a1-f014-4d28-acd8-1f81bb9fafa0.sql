-- Ensure invoice schema is complete with all VAT and Stripe fields
-- Add any missing columns to invoices table
DO $$ 
BEGIN
  -- Add stripe_hosted_invoice_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'stripe_hosted_invoice_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN stripe_hosted_invoice_url TEXT;
  END IF;
END $$;

-- Create stripe webhook events table for audit trail
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  stripe_account_id TEXT,
  invoice_id UUID REFERENCES invoices(id),
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on webhook events
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook events
CREATE POLICY "Admins can view webhook events"
ON stripe_webhook_events
FOR SELECT
USING (is_admin(auth.uid()));

-- System can insert webhook events
CREATE POLICY "System can insert webhook events"  
ON stripe_webhook_events
FOR INSERT
WITH CHECK (true);

-- Add index for fast webhook deduplication
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
ON stripe_webhook_events(event_id);

-- Add index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_invoice_id
ON stripe_webhook_events(invoice_id);

-- Create or replace function to update invoice status from webhooks
CREATE OR REPLACE FUNCTION update_invoice_from_webhook(
  p_stripe_invoice_id TEXT,
  p_status TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET 
    status = p_status,
    paid_at = COALESCE(p_paid_at, paid_at),
    updated_at = NOW()
  WHERE stripe_invoice_id = p_stripe_invoice_id;
  
  -- Log to audit
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
  SELECT 
    vendor_id,
    'invoice_webhook_update',
    'invoices',
    id,
    jsonb_build_object('status', p_status, 'paid_at', p_paid_at)
  FROM invoices
  WHERE stripe_invoice_id = p_stripe_invoice_id;
END;
$$;