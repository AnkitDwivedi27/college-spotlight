-- Add time slot fields and priority to events table
ALTER TABLE public.events 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN priority INTEGER DEFAULT 1;

-- Update approval_status to be automatically approved
ALTER TABLE public.events 
ALTER COLUMN approval_status SET DEFAULT 'approved';

-- Update existing events to be approved and set default times
UPDATE public.events 
SET approval_status = 'approved', 
    start_time = '09:00:00', 
    end_time = '10:00:00',
    priority = 1
WHERE approval_status = 'pending';

-- Create function to check time slot conflicts
CREATE OR REPLACE FUNCTION check_time_slot_conflict(
  p_event_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_event_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events 
    WHERE event_date::DATE = p_event_date
    AND approval_status = 'approved'
    AND (p_event_id IS NULL OR id != p_event_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies to remove approval restrictions
DROP POLICY IF EXISTS "Students can register for approved events" ON event_registrations;
CREATE POLICY "Students can register for events" 
ON event_registrations 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'student')
);

-- Update event creation policy to auto-approve
DROP POLICY IF EXISTS "Organizers and admins can create events" ON events;
CREATE POLICY "Organizers and admins can create events" 
ON events 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ANY (ARRAY['organizer'::text, 'admin'::text]))
  AND NOT check_time_slot_conflict(event_date::DATE, start_time, end_time)
);

-- Allow admins to update priority and organizers to update their own events
DROP POLICY IF EXISTS "Admins can update any event" ON events;
DROP POLICY IF EXISTS "Event creators can update their own pending events" ON events;

CREATE POLICY "Admins can update any event" 
ON events 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Event creators can update their own events" 
ON events 
FOR UPDATE 
USING (created_by = auth.uid());

-- Allow organizers to delete their own events
DROP POLICY IF EXISTS "Event creators can delete their own pending events" ON events;
CREATE POLICY "Event creators can delete their own events" 
ON events 
FOR DELETE 
USING (created_by = auth.uid());