-- Enable realtime for event_registrations table
ALTER TABLE public.event_registrations REPLICA IDENTITY FULL;

-- Add event_registrations to realtime publication
BEGIN;
  -- Remove table if it exists in publication
  DROP PUBLICATION IF EXISTS supabase_realtime;
  -- Create the publication with the table
  CREATE PUBLICATION supabase_realtime;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
COMMIT;