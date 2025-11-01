-- Add teacher details to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS teacher_name TEXT,
ADD COLUMN IF NOT EXISTS teacher_email TEXT;

-- Add roll number and attendance tracking to event_registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT false;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_is_present 
ON public.event_registrations(event_id, is_present);