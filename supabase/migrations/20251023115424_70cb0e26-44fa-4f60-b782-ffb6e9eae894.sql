-- Function to check event capacity before registration
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
BEGIN
  -- Get the maximum capacity for the event
  SELECT max_participants INTO max_capacity
  FROM events
  WHERE id = NEW.event_id;
  
  -- If no max_participants is set, allow registration
  IF max_capacity IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count current registrations for this event
  SELECT COUNT(*) INTO current_count
  FROM event_registrations
  WHERE event_id = NEW.event_id;
  
  -- Check if capacity is exceeded
  IF current_count >= max_capacity THEN
    RAISE EXCEPTION 'Event is full. Maximum capacity of % has been reached.', max_capacity;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check capacity before insert
DROP TRIGGER IF EXISTS check_capacity_before_registration ON event_registrations;
CREATE TRIGGER check_capacity_before_registration
  BEFORE INSERT ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION check_event_capacity();