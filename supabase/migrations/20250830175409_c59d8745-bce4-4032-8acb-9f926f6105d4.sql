-- Security: Restrict public access to profiles and implement role-based visibility

-- 1) Helper function to safely check if current user is admin (avoid recursion in RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'admin'
  );
$$;

-- 2) Remove overly permissive public SELECT policy
DROP POLICY IF EXISTS "Everyone can view basic profiles" ON public.profiles;

-- 3) Replace with safe, role-based SELECT policies
-- a) Users can view only their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- b) Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- c) Organizers can view profiles of users registered to their events
CREATE POLICY "Organizers can view registrants' profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.event_registrations r ON r.event_id = e.id
    WHERE e.created_by = auth.uid()
      AND r.user_id = profiles.user_id
  )
);
