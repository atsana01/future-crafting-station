-- Fix RLS policies for chat attachments and create quote viewing tables

-- Fix RLS policy for chat attachments in secure-uploads bucket
DROP POLICY IF EXISTS "Chat participants can upload files" ON storage.objects;
CREATE POLICY "Chat participants can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'secure-uploads' 
  AND (storage.foldername(name))[1] = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[2]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Chat participants can view files" ON storage.objects;
CREATE POLICY "Chat participants can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'secure-uploads' 
  AND (storage.foldername(name))[1] = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[2]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

-- Create a table for quote reviews
CREATE TABLE IF NOT EXISTS public.quote_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'revision_request', -- 'revision_request', 'acceptance', 'rejection'
  review_notes TEXT,
  requested_changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on quote_reviews
ALTER TABLE public.quote_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_reviews
CREATE POLICY "Quote participants can view reviews"
ON public.quote_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotes q
    JOIN quote_requests qr ON qr.id = q.quote_request_id
    WHERE q.id = quote_reviews.quote_id
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Clients can create reviews"
ON public.quote_reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM quotes q
    JOIN quote_requests qr ON qr.id = q.quote_request_id
    WHERE q.id = quote_reviews.quote_id
    AND qr.client_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_quote_reviews_updated_at
  BEFORE UPDATE ON public.quote_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get detailed quote information for clients
CREATE OR REPLACE FUNCTION public.get_client_quote_details(quote_request_id_param UUID)
RETURNS TABLE(
  quote_id UUID,
  total_amount NUMERIC,
  estimated_timeline TEXT,
  cost_breakdown JSONB,
  start_date DATE,
  duration_weeks INTEGER,
  milestones JSONB,
  payment_schedule JSONB,
  validity_date DATE,
  site_visit_required BOOLEAN,
  proposed_visit_dates JSONB,
  insurance_will_be_used BOOLEAN,
  insurance_provider_used TEXT,
  inclusions TEXT[],
  exclusions TEXT[],
  assumptions_dependencies TEXT,
  notes_to_client TEXT,
  vendor_notes TEXT,
  portfolio_references JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  vendor_business_name TEXT,
  vendor_rating NUMERIC
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id,
    q.total_amount,
    q.estimated_timeline,
    q.cost_breakdown,
    q.start_date,
    q.duration_weeks,
    q.milestones,
    q.payment_schedule,
    q.validity_date,
    q.site_visit_required,
    q.proposed_visit_dates,
    q.insurance_will_be_used,
    q.insurance_provider_used,
    q.inclusions,
    q.exclusions,
    q.assumptions_dependencies,
    q.notes_to_client,
    qr.vendor_notes,
    q.portfolio_references,
    q.created_at,
    vp.business_name,
    vp.rating
  FROM quotes q
  JOIN quote_requests qr ON qr.id = q.quote_request_id
  LEFT JOIN vendor_profiles vp ON vp.user_id = qr.vendor_id
  WHERE qr.id = quote_request_id_param
    AND qr.client_id = auth.uid()
    AND q.is_current_version = true;
$$;