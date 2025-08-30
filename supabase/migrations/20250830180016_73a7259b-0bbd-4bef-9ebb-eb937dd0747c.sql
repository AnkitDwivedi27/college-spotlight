-- Fix organizer access to registration data with profile information
-- The issue is that organizers need to see profile data of users registered to their events
-- but the RLS policy structure is preventing the nested query from working properly

-- Update the organizer policy to be more permissive for their event registrants
DROP POLICY IF EXISTS "Organizers can view registrants' profiles" ON public.profiles;

-- Create a more comprehensive policy for organizers accessing registrant profiles
CREATE POLICY "Organizers can view event registrants profiles"
ON public.profiles
FOR SELECT
USING (
  -- Allow if the profile belongs to someone registered for the organizer's event
  EXISTS (
    SELECT 1
    FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    WHERE e.created_by = auth.uid()
      AND er.user_id = profiles.user_id
  )
  OR
  -- Also allow organizers to see profiles when viewing events (for admin dashboard)
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.role = 'organizer'
      AND profiles.user_id IN (
        SELECT DISTINCT er2.user_id
        FROM public.event_registrations er2
        JOIN public.events e2 ON e2.id = er2.event_id
        WHERE e2.created_by = auth.uid()
      )
  )
);