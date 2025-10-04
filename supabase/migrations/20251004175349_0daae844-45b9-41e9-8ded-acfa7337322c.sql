-- Create RFI tables for structured Request for Information threads

-- 1. Create RFI table (ticket-scoped structured threads)
CREATE TABLE public.rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- 2. Create RFI messages table (thread replies)
CREATE TABLE public.rfi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_hidden BOOLEAN DEFAULT false
);

-- 3. Create RFI attachments table
CREATE TABLE public.rfi_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.rfi_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL
);

-- 4. Create indexes for performance
CREATE INDEX idx_rfis_ticket_id ON public.rfis(ticket_id);
CREATE INDEX idx_rfis_status ON public.rfis(status);
CREATE INDEX idx_rfis_created_at ON public.rfis(created_at DESC);
CREATE INDEX idx_rfi_messages_rfi_id ON public.rfi_messages(rfi_id);
CREATE INDEX idx_rfi_messages_created_at ON public.rfi_messages(created_at);
CREATE INDEX idx_rfi_attachments_rfi_id ON public.rfi_attachments(rfi_id);

-- 5. Enable RLS on all RFI tables
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Create helper function to check ticket participation
CREATE OR REPLACE FUNCTION public.is_ticket_participant(_ticket_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE id = _ticket_id 
      AND (_user_id = client_id OR _user_id = vendor_id)
  );
$$;

-- 7. RLS Policies for rfis table
-- SELECT: ticket participants and admins can view
CREATE POLICY "Ticket participants can view RFIs"
ON public.rfis FOR SELECT
USING (
  is_ticket_participant(ticket_id, auth.uid())
  OR is_admin(auth.uid())
);

-- INSERT: ticket participants can create RFIs, enforce created_by = auth.uid()
CREATE POLICY "Ticket participants can create RFIs"
ON public.rfis FOR INSERT
WITH CHECK (
  is_ticket_participant(ticket_id, auth.uid())
  AND created_by = auth.uid()
);

-- UPDATE: ticket participants can update status and resolve
CREATE POLICY "Ticket participants can update RFIs"
ON public.rfis FOR UPDATE
USING (
  is_ticket_participant(ticket_id, auth.uid())
  OR is_admin(auth.uid())
);

-- 8. RLS Policies for rfi_messages table
-- SELECT: can view if they're a participant of the parent RFI's ticket
CREATE POLICY "Ticket participants can view RFI messages"
ON public.rfi_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfis
    WHERE rfis.id = rfi_messages.rfi_id
      AND (is_ticket_participant(rfis.ticket_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

-- INSERT: can reply if they're a participant, enforce author_id = auth.uid()
CREATE POLICY "Ticket participants can reply to RFIs"
ON public.rfi_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rfis
    WHERE rfis.id = rfi_messages.rfi_id
      AND is_ticket_participant(rfis.ticket_id, auth.uid())
  )
  AND author_id = auth.uid()
);

-- UPDATE: admins only (for moderation - hiding messages)
CREATE POLICY "Admins can moderate RFI messages"
ON public.rfi_messages FOR UPDATE
USING (is_admin(auth.uid()));

-- 9. RLS Policies for rfi_attachments table
-- SELECT: ticket participants can view attachments
CREATE POLICY "Ticket participants can view RFI attachments"
ON public.rfi_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rfis
    WHERE rfis.id = rfi_attachments.rfi_id
      AND (is_ticket_participant(rfis.ticket_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

-- INSERT: ticket participants can upload attachments, enforce uploaded_by = auth.uid()
CREATE POLICY "Ticket participants can upload RFI attachments"
ON public.rfi_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rfis
    WHERE rfis.id = rfi_attachments.rfi_id
      AND is_ticket_participant(rfis.ticket_id, auth.uid())
  )
  AND uploaded_by = auth.uid()
);

-- 10. Create storage bucket for RFI attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rfi-attachments',
  'rfi-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- 11. Storage RLS policies for rfi-attachments bucket
CREATE POLICY "Ticket participants can view RFI attachment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rfi-attachments'
  AND EXISTS (
    SELECT 1 FROM public.rfi_attachments ra
    JOIN public.rfis r ON r.id = ra.rfi_id
    WHERE ra.storage_path = storage.objects.name
      AND (is_ticket_participant(r.ticket_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Ticket participants can upload RFI attachment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rfi-attachments'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- 12. Enable realtime for RFI tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfi_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfi_attachments;

-- 13. Create trigger for updated_at on rfis
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Log RFI creation and resolution to audit
CREATE OR REPLACE FUNCTION public.log_rfi_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event(
      'rfi_created',
      'rfis',
      NEW.id,
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'title', NEW.title,
        'created_by', NEW.created_by
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'resolved' THEN
    PERFORM log_security_event(
      'rfi_resolved',
      'rfis',
      NEW.id,
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'resolved_by', NEW.resolved_by
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_rfi_actions
  AFTER INSERT OR UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.log_rfi_action();