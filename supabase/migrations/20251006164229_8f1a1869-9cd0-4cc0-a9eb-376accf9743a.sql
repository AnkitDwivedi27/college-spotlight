-- Drop the existing restrictive RLS policy that blocks conflicting events
DROP POLICY IF EXISTS "Organizers and admins can create events" ON events;

-- Create a new permissive RLS policy that allows event creation
CREATE POLICY "Organizers and admins can create events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organizer', 'admin')
  )
);

-- Create a trigger function to auto-approve events if no time slot conflict
CREATE OR REPLACE FUNCTION public.auto_approve_event_if_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if there's a time slot conflict
  IF check_time_slot_conflict(NEW.event_date::DATE, NEW.start_time, NEW.end_time, NEW.id) THEN
    -- Conflict exists, set to pending for admin review
    NEW.approval_status = 'pending';
  ELSE
    -- No conflict, auto-approve the event
    NEW.approval_status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before inserting events
DROP TRIGGER IF EXISTS set_event_approval_status ON events;
CREATE TRIGGER set_event_approval_status
BEFORE INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION auto_approve_event_if_no_conflict();