-- Fix RLS policy for messages to allow proper file uploads
DROP POLICY IF EXISTS "Ticket participants can send messages" ON public.messages;

CREATE POLICY "Ticket participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = sender_id) AND 
  (EXISTS (
    SELECT 1 
    FROM quote_requests qr 
    WHERE qr.id = messages.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  ))
);