-- Fix RLS policies for messages to allow ticket participants to send files
-- Update messages table policies
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can update read status" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;

-- Create improved policies for messages
CREATE POLICY "Ticket participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = messages.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Ticket participants can view messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id = messages.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Recipients can update read status" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Create storage bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat attachments
CREATE POLICY "Ticket participants can upload chat files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[1]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Ticket participants can view chat files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[1]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for portfolio images
CREATE POLICY "Vendors can upload portfolio images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'portfolio-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view portfolio images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'portfolio-images');

CREATE POLICY "Vendors can update their portfolio images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'portfolio-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Vendors can delete their portfolio images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'portfolio-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);