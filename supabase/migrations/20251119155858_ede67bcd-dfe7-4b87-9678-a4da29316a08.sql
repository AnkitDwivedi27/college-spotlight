-- SECURITY FIX: Remove ability for users to change their own role
-- This prevents privilege escalation attacks

-- Drop the existing policy that allows users to update their own profile without restrictions
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new policy that allows users to update their profile EXCEPT the role field
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Ensure role cannot be changed by the user
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Ensure only admins can change roles in profiles table
CREATE POLICY "Only admins can change user roles in profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add policy to ensure user_roles table is also protected
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure handle_new_user trigger is SECURITY DEFINER and cannot be exploited
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always default to student role for new signups
  -- Only admins can change this later
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.email,
    'student'  -- Force student role, ignore any metadata
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'student'::app_role  -- Force student role
  );
  
  RETURN NEW;
END;
$$;