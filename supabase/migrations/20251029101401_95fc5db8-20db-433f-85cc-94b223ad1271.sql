-- Create certificates table to track issued certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  issued_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Students can view their own certificates
CREATE POLICY "Users can view their own certificates"
ON public.certificates
FOR SELECT
USING (user_id = auth.uid());

-- Organizers can issue certificates for their events
CREATE POLICY "Organizers can issue certificates for their events"
ON public.certificates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = certificates.event_id
    AND events.created_by = auth.uid()
  )
);

-- Organizers can view certificates for their events
CREATE POLICY "Organizers can view certificates for their events"
ON public.certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = certificates.event_id
    AND events.created_by = auth.uid()
  )
);

-- Admins can manage all certificates
CREATE POLICY "Admins can manage all certificates"
ON public.certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX idx_certificates_event_id ON public.certificates(event_id);