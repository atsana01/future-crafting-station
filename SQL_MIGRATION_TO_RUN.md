# Cyprus VAT & Stripe Connect - SQL Migration

**IMPORTANT:** Copy and paste this entire SQL script into your Supabase SQL Editor and run it.

```sql
-- Phase 2: Cyprus VAT-Aware Invoicing with Stripe Connect

-- 1. Add Stripe Connect fields to vendor_profiles
ALTER TABLE public.vendor_profiles 
ADD COLUMN IF NOT EXISTS established_in_cyprus BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;

-- 2. Extend invoices table with VAT and Stripe fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS quote_version_id UUID REFERENCES public.quotes(id),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_basis TEXT CHECK (vat_basis IN ('standard19', 'reduced5_renovation', 'reduced5_primary_residence', 'reverse_charge')),
ADD COLUMN IF NOT EXISTS reverse_charge_note TEXT,
ADD COLUMN IF NOT EXISTS tax_point TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS legal_invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS place_of_supply TEXT,
ADD COLUMN IF NOT EXISTS property_location TEXT,
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS dwelling_age_years INTEGER,
ADD COLUMN IF NOT EXISTS materials_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS property_area_sqm DECIMAL(10,2);

-- 3. Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_amount DECIMAL(10,2) NOT NULL,
  tax_rate_id TEXT,
  is_material BOOLEAN DEFAULT false,
  line_total DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS on invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for invoice_items
CREATE POLICY "Users can view their own invoice items"
ON public.invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.client_id = auth.uid() OR invoices.vendor_id = auth.uid())
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "Vendors can insert invoice items for their invoices"
ON public.invoice_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND invoices.vendor_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update their invoice items"
ON public.invoice_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND invoices.vendor_id = auth.uid()
      AND invoices.status IN ('draft', 'pending')
  )
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_legal_invoice_number ON public.invoices(legal_invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_vat_basis ON public.invoices(vat_basis);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_stripe_connect_id ON public.vendor_profiles(stripe_connect_id);

-- 7. Create function to generate legal invoice number
CREATE OR REPLACE FUNCTION public.generate_legal_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INT;
  invoice_number TEXT;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(legal_invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.invoices
  WHERE legal_invoice_number LIKE 'INV-' || year_suffix || '-%';
  
  invoice_number := 'INV-' || year_suffix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN invoice_number;
END;
$$;

-- 8. Create trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.legal_invoice_number IS NULL THEN
    NEW.legal_invoice_number := generate_legal_invoice_number();
  END IF;
  
  IF NEW.issued_at IS NULL THEN
    NEW.issued_at := NOW();
  END IF;
  
  IF NEW.tax_point IS NULL THEN
    NEW.tax_point := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON public.invoices;
CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number();

-- 9. Create audit logging for invoice actions
CREATE OR REPLACE FUNCTION public.log_invoice_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event(
      'invoice_created',
      'invoices',
      NEW.id,
      jsonb_build_object(
        'vendor_id', NEW.vendor_id,
        'client_id', NEW.client_id,
        'total_amount', NEW.total_amount,
        'vat_basis', NEW.vat_basis,
        'legal_invoice_number', NEW.legal_invoice_number
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM log_security_event(
        'invoice_status_changed',
        'invoices',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'legal_invoice_number', NEW.legal_invoice_number
        )
      );
    END IF;
    
    IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
      PERFORM log_security_event(
        'invoice_paid',
        'invoices',
        NEW.id,
        jsonb_build_object(
          'amount', NEW.total_amount,
          'legal_invoice_number', NEW.legal_invoice_number
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_invoice_actions ON public.invoices;
CREATE TRIGGER log_invoice_actions
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_action();

-- 10. Create view for invoice analytics
CREATE OR REPLACE VIEW public.invoice_analytics AS
SELECT 
  i.vendor_id,
  v.business_name as vendor_name,
  i.vat_basis,
  COUNT(*) as invoice_count,
  SUM(i.total_amount) as total_revenue,
  SUM(i.vat_amount) as total_vat_collected,
  AVG(EXTRACT(EPOCH FROM (i.paid_at - i.created_at)) / 86400) as avg_days_to_pay,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count
FROM public.invoices i
LEFT JOIN public.vendor_profiles v ON v.user_id = i.vendor_id
GROUP BY i.vendor_id, v.business_name, i.vat_basis;

GRANT SELECT ON public.invoice_analytics TO authenticated;

-- 11. Comments for documentation
COMMENT ON COLUMN public.invoices.vat_basis IS 
'Cyprus VAT basis: standard19 (19%), reduced5_renovation (5% for renovations), reduced5_primary_residence (5% for first 130m² of primary residence), reverse_charge (domestic reverse charge for B2B construction)';

COMMENT ON COLUMN public.invoices.tax_point IS 
'Tax point: the date when VAT becomes chargeable (usually delivery/completion date)';

COMMENT ON COLUMN public.invoices.issued_at IS 
'Invoice issue date: must be within 30 days of tax point per Cyprus VAT regulations';

COMMENT ON TABLE public.invoice_items IS 
'Line items for invoices with individual tax rates and material flags for VAT calculations';
```

## After Running

Once you've run this migration:
1. Check for any errors in the SQL editor
2. Verify the new columns exist in `vendor_profiles` and `invoices` tables
3. Confirm the `invoice_items` table was created
4. Test that the trigger generates invoice numbers correctly

Let me know when this is complete and I'll proceed with the edge functions!
