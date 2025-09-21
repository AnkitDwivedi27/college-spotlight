-- Fix RLS recursion causing profile fetch failures
-- 1) Update profiles policy for organizers to avoid self-referencing profiles
DROP POLICY IF EXISTS "Organizers can view event registrants profiles" ON public.profiles;
CREATE POLICY "Organizers can view event registrants profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only organizers
  public.has_role(auth.uid(), 'organizer')
  AND EXISTS (
    SELECT 1
    FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    WHERE e.created_by = auth.uid() AND er.user_id = profiles.user_id
  )
);

-- 2) Replace event_registrations role checks that referenced profiles with has_role()
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
CREATE POLICY "Admins can view all registrations"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Students can register for events" ON public.event_registrations;
CREATE POLICY "Students can register for events"
ON public.event_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_role(auth.uid(), 'student')
);

-- Keep existing safe policies as-is (self-access and organizer event access)
-- Users can view their own registrations (already present)
-- Users can cancel their own registrations (already present)
-- Organizers can view registrations for their events (already present)
