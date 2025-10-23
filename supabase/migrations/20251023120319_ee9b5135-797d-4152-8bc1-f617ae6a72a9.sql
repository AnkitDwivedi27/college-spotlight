-- Strengthen capacity enforcement with row lock to avoid race conditions
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
  -- Lock the event row to serialize concurrent registrations for the same event
  SELECT max_participants INTO max_capacity
  FROM events
  WHERE id = NEW.event_id
  FOR UPDATE;

  -- If no max_participants is set, allow registration
  IF max_capacity IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count current registrations for this event after acquiring the lock
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

-- Trigger already exists; no need to recreate.