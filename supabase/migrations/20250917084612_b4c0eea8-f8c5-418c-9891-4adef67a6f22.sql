-- Add comprehensive business information fields to vendor_profiles table
ALTER TABLE public.vendor_profiles 
ADD COLUMN website text,
ADD COLUMN phone text,
ADD COLUMN email text,
ADD COLUMN vendor_category text,
ADD COLUMN price_range_min numeric,
ADD COLUMN price_range_max numeric,
ADD COLUMN year_established integer,
ADD COLUMN insurance_coverage boolean DEFAULT false,
ADD COLUMN insurance_provider text,
ADD COLUMN service_radius text,
ADD COLUMN team_size integer,
ADD COLUMN licenses_certifications jsonb DEFAULT '[]'::jsonb,
ADD COLUMN about_business text;

-- Create quotes table for detailed quote information
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  cost_breakdown jsonb DEFAULT '[]'::jsonb,
  estimated_timeline text,
  start_date date,
  duration_weeks integer,
  milestones jsonb DEFAULT '[]'::jsonb,
  inclusions text[],
  exclusions text[],
  payment_schedule jsonb DEFAULT '{}'::jsonb,
  validity_date date,
  site_visit_required boolean DEFAULT false,
  proposed_visit_dates jsonb DEFAULT '[]'::jsonb,
  insurance_will_be_used boolean DEFAULT false,
  insurance_provider_used text,
  portfolio_references jsonb DEFAULT '[]'::jsonb,
  assumptions_dependencies text,
  notes_to_client text,
  change_note text,
  is_current_version boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quotes table
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Users can view their quotes" 
ON public.quotes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = quotes.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Vendors can create quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = quotes.quote_request_id 
    AND qr.vendor_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update their quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = quotes.quote_request_id 
    AND qr.vendor_id = auth.uid()
  )
);

-- Create project_attachments table for client uploads
CREATE TABLE public.project_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_attachments
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for project_attachments
CREATE POLICY "Project owners can manage attachments" 
ON public.project_attachments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_attachments.project_id 
    AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Vendors with quotes can view attachments" 
ON public.project_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    INNER JOIN public.projects p ON p.id = qr.project_id 
    WHERE p.id = project_attachments.project_id 
    AND qr.vendor_id = auth.uid() 
    AND qr.status IN ('pending', 'quoted', 'accepted')
  )
);

-- Add updated_at trigger for quotes table
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_quotes_quote_request_id ON public.quotes(quote_request_id);
CREATE INDEX idx_quotes_version ON public.quotes(quote_request_id, version);
CREATE INDEX idx_project_attachments_project_id ON public.project_attachments(project_id);