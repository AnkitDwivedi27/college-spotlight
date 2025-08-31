-- Fix infinite recursion in profiles RLS policies
-- The issue is that is_admin() function queries profiles table, which triggers RLS again

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simpler admin policy that doesn't cause recursion
-- Use a direct role check instead of the is_admin function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
  OR auth.uid() = user_id  -- Users can always see their own profile
);

-- Also ensure users can always see their own profile first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);