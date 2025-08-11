-- Ensure events table has all required columns and proper structure
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS organizer_name TEXT,
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;

-- Update events table to ensure proper status values
ALTER TABLE public.events 
ALTER COLUMN approval_status TYPE TEXT,
ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON public.events(approval_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_event ON public.event_registrations(user_id, event_id);

-- Update RLS policies for events table
DROP POLICY IF EXISTS "Admins can approve events" ON public.events;
DROP POLICY IF EXISTS "Event creators can delete their events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update their events" ON public.events;
DROP POLICY IF EXISTS "Everyone can view events" ON public.events;
DROP POLICY IF EXISTS "Faculty and admin can create events" ON public.events;

-- Create comprehensive RLS policies for events
CREATE POLICY "Everyone can view events" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Organizers and admins can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('organizer', 'admin')
  )
);

CREATE POLICY "Event creators can update their own pending events" 
ON public.events 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  AND approval_status = 'pending'
);

CREATE POLICY "Admins can update any event" 
ON public.events 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Event creators can delete their own pending events" 
ON public.events 
FOR DELETE 
USING (
  created_by = auth.uid() 
  AND approval_status = 'pending'
);

CREATE POLICY "Admins can delete any event" 
ON public.events 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Update RLS policies for event_registrations
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON public.event_registrations;

-- Create comprehensive RLS policies for event_registrations
CREATE POLICY "Students can register for approved events" 
ON public.event_registrations 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND events.approval_status = 'approved'
  )
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'student'
  )
);

CREATE POLICY "Users can view their own registrations" 
ON public.event_registrations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Organizers can view registrations for their events" 
ON public.event_registrations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_id 
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can view all registrations" 
ON public.event_registrations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can cancel their own registrations" 
ON public.event_registrations 
FOR DELETE 
USING (user_id = auth.uid());

-- Update profiles table RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Everyone can view basic profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create a function to get user profile with role
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  department TEXT,
  year_of_study INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.department,
    p.year_of_study
  FROM profiles p
  WHERE p.user_id = user_uuid;
$$;