-- Create invoices table for payment processing
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  client_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  total_amount numeric NOT NULL,
  service_fee_percentage numeric NOT NULL DEFAULT 2.0,
  service_fee_amount numeric NOT NULL,
  vendor_payout_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_intent_id text,
  client_signature_url text,
  vendor_signature_url text,
  client_signed_at timestamp with time zone,
  vendor_signed_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can view their invoices"
ON public.invoices
FOR SELECT 
USING (auth.uid() = client_id OR auth.uid() = vendor_id);

CREATE POLICY "Clients can create invoices"
ON public.invoices
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Invoice participants can update signatures"
ON public.invoices
FOR UPDATE 
USING (auth.uid() = client_id OR auth.uid() = vendor_id);

-- Create vendor tiers table for service fee calculation
CREATE TABLE public.vendor_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL UNIQUE,
  tier_name text NOT NULL DEFAULT 'free',
  service_fee_percentage numeric NOT NULL DEFAULT 2.0,
  monthly_fee numeric NOT NULL DEFAULT 0,
  quotes_per_month integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for vendor tiers
ALTER TABLE public.vendor_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor tiers
CREATE POLICY "Vendors can view their tier"
ON public.vendor_tiers
FOR SELECT 
USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their tier"
ON public.vendor_tiers
FOR ALL
USING (auth.uid() = vendor_id);

-- Add updated_at trigger for invoices
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for vendor_tiers
CREATE TRIGGER update_vendor_tiers_updated_at
BEFORE UPDATE ON public.vendor_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get vendor service fee percentage
CREATE OR REPLACE FUNCTION public.get_vendor_service_fee(vendor_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT service_fee_percentage FROM vendor_tiers WHERE vendor_id = vendor_user_id),
    2.0  -- Default 2% for free tier
  );
$$;

-- Function to create invoice from accepted quote
CREATE OR REPLACE FUNCTION public.create_invoice_from_quote(quote_request_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  quote_data record;
  service_fee_pct numeric;
  service_fee_amt numeric;
  vendor_payout numeric;
  invoice_num text;
  new_invoice_id uuid;
BEGIN
  -- Get quote and request details
  SELECT 
    q.id as quote_id,
    q.total_amount,
    qr.client_id,
    qr.vendor_id
  INTO quote_data
  FROM quotes q
  JOIN quote_requests qr ON qr.id = q.quote_request_id
  WHERE qr.id = quote_request_id_param 
    AND q.is_current_version = true
    AND qr.status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found or not accepted';
  END IF;

  -- Get vendor service fee percentage
  service_fee_pct := get_vendor_service_fee(quote_data.vendor_id);
  service_fee_amt := quote_data.total_amount * (service_fee_pct / 100);
  vendor_payout := quote_data.total_amount - service_fee_amt;

  -- Generate invoice number
  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                 LPAD((EXTRACT(EPOCH FROM NOW())::bigint % 10000)::text, 4, '0');

  -- Create invoice
  INSERT INTO invoices (
    quote_id,
    client_id,
    vendor_id,
    invoice_number,
    total_amount,
    service_fee_percentage,
    service_fee_amount,
    vendor_payout_amount,
    status
  ) VALUES (
    quote_data.quote_id,
    quote_data.client_id,
    quote_data.vendor_id,
    invoice_num,
    quote_data.total_amount,
    service_fee_pct,
    service_fee_amt,
    vendor_payout,
    'pending_signatures'
  )
  RETURNING id INTO new_invoice_id;

  RETURN new_invoice_id;
END;
$$;